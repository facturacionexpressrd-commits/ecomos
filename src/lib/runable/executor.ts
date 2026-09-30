/**
 * Runable Agent Executor
 *
 * Orchestrates agent workflow execution and state management
 */

import { getAgentWithDecryptedKey, updateExecution, createActionLog } from './db';
import { executeCampaignManagerWorkflow } from './workflows/campaign-manager';
import { runableClient } from './client';
import type { AgentType, CampaignManagerOutput } from '@/lib/types/runable';

export interface AgentExecutionContext {
  storeId: string;
  agentId: string;
  agentType: AgentType;
  trigger: 'manual' | 'schedule' | 'webhook';
  inputData?: Record<string, any>;
}

export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed' | 'pending';
  output?: Record<string, any>;
  error?: string;
  actionsTaken: number;
  duration: number; // milliseconds
}

/**
 * Execute a Runable agent workflow
 */
export async function executeAgent(
  context: AgentExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 1. Fetch agent configuration
    const agent = await getAgentWithDecryptedKey(context.agentId, context.storeId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // 2. Execute workflow based on type
    let output: Record<string, any>;

    switch (agent.agentType) {
      case 'campaign_manager':
        output = await executeCampaignManagerWorkflow(
          agent.id,
          context.storeId,
          agent.config as any,
          {
            trigger: context.trigger as 'new_product' | 'hourly_check' | 'manual',
            storeId: context.storeId,
            timestamp: new Date(),
            ...context.inputData
          }
        );
        break;

      case 'product_copy':
        // TODO: Implement product copy workflow
        output = { status: 'pending', message: 'Product copy workflow not yet implemented' };
        break;

      case 'performance_optimizer':
        // TODO: Implement performance optimizer workflow
        output = { status: 'pending', message: 'Performance optimizer workflow not yet implemented' };
        break;

      default:
        throw new Error(`Unknown agent type: ${agent.agentType}`);
    }

    // 3. Update execution record
    const duration = Date.now() - startTime;
    await updateExecution(executionId, {
      status: 'completed',
      outputData: output,
      completedAt: new Date(),
      metaActionsCount: (output as any)?.actions_taken?.length || 0
    });

    // 4. Return result
    return {
      executionId,
      status: 'completed',
      output,
      actionsTaken: (output as any)?.actions_taken?.length || 0,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`Agent execution failed: ${errorMessage}`);

    // Update execution with error
    await updateExecution(executionId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date()
    });

    return {
      executionId,
      status: 'failed',
      error: errorMessage,
      actionsTaken: 0,
      duration
    };
  }
}

/**
 * Execute all active agents for a store
 */
export async function executeStoreAgents(
  storeId: string,
  trigger: 'schedule' | 'webhook'
): Promise<ExecutionResult[]> {
  try {
    // Fetch all active agents for store
    const { agents } = await (await import('./db')).listAgents(storeId, 1, 1000);
    const activeAgents = agents.filter(a => a.status === 'active');

    if (activeAgents.length === 0) {
      console.log(`No active agents for store ${storeId}`);
      return [];
    }

    console.log(`Executing ${activeAgents.length} agents for store ${storeId}`);

    // Execute each agent in parallel
    const results = await Promise.all(
      activeAgents.map(agent =>
        executeAgent({
          storeId,
          agentId: agent.id,
          agentType: agent.agentType as AgentType,
          trigger
        })
      )
    );

    return results;
  } catch (error) {
    console.error(`Failed to execute store agents: ${error}`);
    return [];
  }
}

/**
 * Handle agent execution triggered by webhook
 * (e.g., when new product is added to Shopify)
 */
export async function handleWebhookTrigger(
  storeId: string,
  eventType: string,
  eventData: Record<string, any>
): Promise<ExecutionResult[]> {
  try {
    // Fetch agents that should handle this event
    const { agents } = await (await import('./db')).listAgents(storeId, 1, 1000);

    // Filter agents by type and trigger
    const relevantAgents = agents.filter(a => {
      if (a.status !== 'active') return false;

      // Campaign manager triggers on product events
      if (a.agentType === 'campaign_manager' && eventType === 'product:created') {
        return true;
      }

      return false;
    });

    if (relevantAgents.length === 0) {
      console.log(`No agents configured for event: ${eventType}`);
      return [];
    }

    console.log(`Executing ${relevantAgents.length} agents for ${eventType}`);

    // Execute relevant agents
    const results = await Promise.all(
      relevantAgents.map(agent =>
        executeAgent({
          storeId,
          agentId: agent.id,
          agentType: agent.agentType as AgentType,
          trigger: 'webhook',
          inputData: eventData
        })
      )
    );

    return results;
  } catch (error) {
    console.error(`Failed to handle webhook trigger: ${error}`);
    return [];
  }
}
