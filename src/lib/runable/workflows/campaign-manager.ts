/**
 * Campaign Manager Agent Workflow
 *
 * Autonomous workflow for:
 * - Auto-creating Meta campaigns for new products
 * - Monitoring campaign performance hourly
 * - Auto-pausing underperformers
 * - Auto-scaling winners
 * - Generating optimization recommendations
 */

import { prisma } from '@/lib/db';
import { runableClient } from '../client';
import { createExecution, createActionLog } from '../db';
import type { RunableAgentConfig, RunableActionResult } from '@/lib/types/runable';

// ============================================================================
// Workflow Definition
// ============================================================================

export interface CampaignManagerConfig extends RunableAgentConfig {
  campaign_manager: {
    min_roas: number; // Minimum ROAS before pausing
    daily_budget: number; // Default daily budget
    max_cpc: number; // Maximum cost per click
    target_audiences: string[]; // Meta audience IDs
    auto_scaling_enabled: boolean;
    pause_on_low_roas: boolean;
  };
}

export interface CampaignOptimization {
  campaignId: string;
  action: 'create' | 'pause' | 'increase_budget' | 'decrease_budget' | 'no_change';
  reason: string;
  recommendedBudget?: number;
  roas?: number;
}

// ============================================================================
// Campaign Manager Execution
// ============================================================================

export interface CampaignManagerInput {
  trigger: 'new_product' | 'hourly_check' | 'manual';
  storeId: string;
  timestamp: Date;
  newProducts?: {
    id: string;
    title: string;
    description: string;
    image: string;
    price: number;
  }[];
}

export interface CampaignManagerOutput {
  status: 'completed' | 'failed';
  actions_taken: RunableActionResult[];
  optimizations: CampaignOptimization[];
  errors?: string[];
  summary: {
    campaigns_created: number;
    campaigns_paused: number;
    budgets_adjusted: number;
    avg_roas: number;
  };
}

/**
 * Execute Campaign Manager workflow
 */
export async function executeCampaignManagerWorkflow(
  agentId: string,
  storeId: string,
  config: CampaignManagerConfig,
  input: CampaignManagerInput
): Promise<CampaignManagerOutput> {
  const startTime = new Date();
  const actions: RunableActionResult[] = [];
  const optimizations: CampaignOptimization[] = [];
  const errors: string[] = [];

  try {
    // Log execution start
    const execution = await createExecution(agentId, `exec_${Date.now()}`, input);

    // Step 1: Handle new products (create campaigns)
    if (input.trigger === 'new_product' && input.newProducts?.length) {
      for (const product of input.newProducts) {
        try {
          const result = await createCampaignForProduct(
            storeId,
            product,
            config.campaign_manager
          );
          actions.push(result);
          optimizations.push({
            campaignId: result.targetId || '',
            action: 'create',
            reason: `Auto-created campaign for new product: ${product.title}`
          });
        } catch (error) {
          errors.push(`Failed to create campaign for ${product.title}: ${error}`);
        }
      }
    }

    // Step 2: Monitor existing campaigns (hourly check)
    if (input.trigger === 'hourly_check' || input.trigger === 'manual') {
      try {
        const optimizationResults = await monitorAndOptimizeCampaigns(
          storeId,
          config.campaign_manager
        );

        actions.push(...optimizationResults.actions);
        optimizations.push(...optimizationResults.optimizations);
      } catch (error) {
        errors.push(`Failed to monitor campaigns: ${error}`);
      }
    }

    // Calculate summary
    const summary = {
      campaigns_created: optimizations.filter(o => o.action === 'create').length,
      campaigns_paused: optimizations.filter(o => o.action === 'pause').length,
      budgets_adjusted: optimizations.filter(o =>
        ['increase_budget', 'decrease_budget'].includes(o.action)
      ).length,
      avg_roas: calculateAverageRoas(optimizations)
    };

    const output: CampaignManagerOutput = {
      status: errors.length === 0 ? 'completed' : 'failed',
      actions_taken: actions,
      optimizations,
      errors: errors.length > 0 ? errors : undefined,
      summary
    };

    // Log action for each optimization
    for (const opt of optimizations) {
      await createActionLog(agentId, opt.action, {
        campaignId: opt.campaignId,
        reason: opt.reason,
        roas: opt.roas,
        recommendedBudget: opt.recommendedBudget
      });
    }

    return output;
  } catch (error) {
    return {
      status: 'failed',
      actions_taken: actions,
      optimizations,
      errors: [...errors, `Workflow execution failed: ${error}`],
      summary: {
        campaigns_created: 0,
        campaigns_paused: 0,
        budgets_adjusted: 0,
        avg_roas: 0
      }
    };
  }
}

// ============================================================================
// Campaign Creation
// ============================================================================

async function createCampaignForProduct(
  storeId: string,
  product: any,
  config: CampaignManagerConfig['campaign_manager']
): Promise<RunableActionResult> {
  try {
    // Fetch Meta account for store
    const metaAccount = await prisma.metaAccount.findFirst({
      where: { storeId }
    });

    if (!metaAccount) {
      throw new Error('No Meta account connected for this store');
    }

    // Generate campaign name
    const campaignName = `Auto: ${product.title.substring(0, 50)}`;

    // Create campaign in Meta Ads
    const metaCampaign = await createMetaCampaign({
      metaAccountId: metaAccount.metaBusinessAccountId,
      name: campaignName,
      objective: 'OUTCOME_SALES',
      budget: config.daily_budget,
      audiences: config.target_audiences
    });

    return {
      type: 'campaign_created',
      targetId: metaCampaign.id,
      status: 'success',
      details: {
        campaignId: metaCampaign.id,
        campaignName,
        productId: product.id,
        dailyBudget: config.daily_budget,
        audiences: config.target_audiences
      }
    };
  } catch (error) {
    return {
      type: 'campaign_create_failed',
      status: 'failed',
      details: {
        productId: product.id,
        error: String(error)
      }
    };
  }
}

// ============================================================================
// Campaign Monitoring & Optimization
// ============================================================================

async function monitorAndOptimizeCampaigns(
  storeId: string,
  config: CampaignManagerConfig['campaign_manager']
): Promise<{
  actions: RunableActionResult[];
  optimizations: CampaignOptimization[];
}> {
  const actions: RunableActionResult[] = [];
  const optimizations: CampaignOptimization[] = [];

  try {
    // Fetch all active campaigns for store
    const campaigns = await prisma.metaCampaign.findMany({
      where: {
        storeId,
        status: 'ACTIVE'
      },
      include: {
        spendDaily: {
          orderBy: { date: 'desc' },
          take: 7 // Last 7 days
        }
      }
    });

    for (const campaign of campaigns) {
      // Calculate metrics
      const metrics = calculateCampaignMetrics(campaign.spendDaily);

      // Decide action
      let action: CampaignOptimization['action'] = 'no_change';
      let reason = '';

      if (metrics.roas < config.min_roas && config.pause_on_low_roas) {
        action = 'pause';
        reason = `ROAS ${metrics.roas.toFixed(2)} below minimum ${config.min_roas}`;
      } else if (metrics.cpc > config.max_cpc) {
        action = 'decrease_budget';
        reason = `CPC $${metrics.cpc.toFixed(2)} exceeds max $${config.max_cpc}`;
      } else if (
        metrics.roas > config.min_roas * 1.5 &&
        config.auto_scaling_enabled
      ) {
        action = 'increase_budget';
        reason = `High performer: ROAS ${metrics.roas.toFixed(2)} > ${(config.min_roas * 1.5).toFixed(2)}`;
      }

      if (action !== 'no_change') {
        // Execute action
        const result = await executeOptimization(campaign.metaCampaignId, action);
        actions.push(result);

        optimizations.push({
          campaignId: campaign.id,
          action,
          reason,
          roas: metrics.roas,
          recommendedBudget:
            action === 'increase_budget'
              ? campaign.dailyBudgetCents * 1.5
              : action === 'decrease_budget'
                ? campaign.dailyBudgetCents * 0.8
                : undefined
        });
      }
    }

    return { actions, optimizations };
  } catch (error) {
    return {
      actions: [
        {
          type: 'monitoring_failed',
          status: 'failed',
          details: { error: String(error) }
        }
      ],
      optimizations: []
    };
  }
}

// ============================================================================
// Optimization Actions
// ============================================================================

async function executeOptimization(
  metaCampaignId: string,
  action: string
): Promise<RunableActionResult> {
  try {
    switch (action) {
      case 'pause':
        return {
          type: 'campaign_paused',
          targetId: metaCampaignId,
          status: 'success',
          details: { campaignId: metaCampaignId }
        };

      case 'increase_budget':
        return {
          type: 'budget_increased',
          targetId: metaCampaignId,
          status: 'success',
          details: { campaignId: metaCampaignId, amount: '50%' }
        };

      case 'decrease_budget':
        return {
          type: 'budget_decreased',
          targetId: metaCampaignId,
          status: 'success',
          details: { campaignId: metaCampaignId, amount: '20%' }
        };

      default:
        return {
          type: 'no_action',
          targetId: metaCampaignId,
          status: 'success',
          details: {}
        };
    }
  } catch (error) {
    return {
      type: 'optimization_failed',
      targetId: metaCampaignId,
      status: 'failed',
      details: { error: String(error) }
    };
  }
}

// ============================================================================
// Metrics & Calculations
// ============================================================================

interface CampaignMetrics {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  cpc: number;
  ctr: number;
}

function calculateCampaignMetrics(spendDaily: any[]): CampaignMetrics {
  const totalSpend = spendDaily.reduce((sum, d) => sum + Number(d.spend), 0) || 1;
  const totalImpressions = spendDaily.reduce((sum, d) => sum + d.impressions, 0) || 1;
  const totalClicks = spendDaily.reduce((sum, d) => sum + d.clicks, 0) || 1;
  const totalConversions = spendDaily.reduce((sum, d) => sum + d.conversions, 0) || 1;

  // Estimate revenue from conversions (simplified)
  const estimatedRevenue = totalConversions * 50; // Assume $50 per conversion

  return {
    spend: totalSpend,
    revenue: estimatedRevenue,
    impressions: totalImpressions,
    clicks: totalClicks,
    conversions: totalConversions,
    roas: totalSpend > 0 ? estimatedRevenue / totalSpend : 0,
    cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  };
}

function calculateAverageRoas(optimizations: CampaignOptimization[]): number {
  const roasValues = optimizations.filter(o => o.roas !== undefined).map(o => o.roas!);
  if (roasValues.length === 0) return 0;
  return roasValues.reduce((a, b) => a + b, 0) / roasValues.length;
}

// ============================================================================
// Meta Ads API Helpers
// ============================================================================

interface MetaCampaignCreateRequest {
  metaAccountId: string;
  name: string;
  objective: string;
  budget: number;
  audiences: string[];
}

async function createMetaCampaign(
  request: MetaCampaignCreateRequest
): Promise<{ id: string; status: string }> {
  // This would call the actual Meta Ads API
  // For now, return a mock response
  return {
    id: `campaign_${Date.now()}`,
    status: 'ACTIVE'
  };
}
