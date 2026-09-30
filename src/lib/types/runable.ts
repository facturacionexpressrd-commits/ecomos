/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Runable AI Integration Types
 *
 * Types for Runable AI agent management and execution
 */

// ============================================================================
// Agent Configuration Types
// ============================================================================

export type AgentType = 'campaign_manager' | 'product_copy' | 'performance_optimizer';
export type AgentStatus = 'active' | 'paused' | 'archived';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ActionStatus = 'success' | 'failed' | 'pending_approval';

export interface RunableAgentConfig {
  // Campaign Manager specific
  campaign_manager?: {
    min_roas: number; // Minimum ROAS threshold
    daily_budget: number; // Default daily budget in USD
    max_cpc: number; // Maximum cost per click
    target_audiences: string[]; // Audience IDs
    auto_scaling_enabled: boolean;
    pause_on_low_roas: boolean;
  };

  // Product Copy specific
  product_copy?: {
    generate_variations: boolean;
    num_variations: number;
    tone: 'professional' | 'casual' | 'playful' | 'technical';
    include_seo_keywords: boolean;
    auto_upload_to_meta: boolean;
  };

  // Performance Optimizer specific
  performance_optimizer?: {
    check_frequency: 'hourly' | '6_hourly' | 'daily';
    budget_increase_threshold: number; // ROAS > threshold
    budget_decrease_threshold: number; // ROAS < threshold
    max_budget_increase: number; // % to increase
    max_budget_decrease: number; // % to decrease
    alert_on_drop: boolean;
    alert_threshold: number; // % drop to alert
  };
}

export interface RunableAgentRecord {
  id: string;
  storeId: string;
  agentId: string; // Runable AI agent ID
  agentName: string;
  agentType: AgentType;
  status: AgentStatus;
  config: RunableAgentConfig;
  runableApiKeyEncrypted: string;
  webhook_secret?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface RunableAgentExecutionRecord {
  id: string;
  agentId: string;
  executionId: string; // Runable execution ID
  status: ExecutionStatus;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  metaActionsCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface RunableExecutionInput {
  trigger: string; // 'manual', 'schedule', 'webhook', etc.
  timestamp: Date;
  data: Record<string, any>;
}

export interface RunableExecutionOutput {
  execution_id: string;
  status: ExecutionStatus;
  actions_taken: RunableActionResult[];
  errors?: string[];
  metadata?: Record<string, any>;
}

// ============================================================================
// Action Log Types
// ============================================================================

export interface RunableAgentActionLogRecord {
  id: string;
  agentId: string;
  actionType: string; // 'campaign_created', 'budget_updated', 'campaign_paused', etc.
  targetId?: string; // Meta campaign ID or Shopify product ID
  actionData: Record<string, any>;
  status: ActionStatus;
  errorMessage?: string;
  approvedBy?: string; // User ID if manual approval
  approvedAt?: Date;
  createdAt: Date;
}

export interface RunableActionResult {
  type: string;
  targetId?: string;
  status: ActionStatus;
  details: Record<string, any>;
  error?: string;
}

// ============================================================================
// Meta Ads Action Types
// ============================================================================

export interface MetaCampaignCreationRequest {
  name: string;
  objective: string; // OUTCOME_ENGAGEMENT, OUTCOME_SALES, etc.
  special_ad_categories: string[];
  budget_rebalance_flag: boolean;
}

export interface MetaBudgetUpdateRequest {
  campaign_id: string;
  daily_budget?: number; // in cents
  lifetime_budget?: number; // in cents
}

export interface MetaCampaignStatusUpdate {
  campaign_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  reason?: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface RunableWebhookPayload {
  execution_id: string;
  agent_id: string;
  status: ExecutionStatus;
  timestamp: Date;
  output: RunableExecutionOutput;
  signature?: string; // HMAC signature for verification
}

export interface RunableWebhookEvent {
  id: string;
  type: string; // 'execution.completed', 'execution.failed', etc.
  timestamp: Date;
  payload: RunableWebhookPayload;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateRunableAgentRequest {
  name: string;
  type: AgentType;
  config: RunableAgentConfig;
  webhook_url: string;
}

export interface RunableAgentResponse {
  id: string;
  name: string;
  type: AgentType;
  status: 'active' | 'inactive';
  created_at: Date;
  webhook_url: string;
}

export interface ListRunableAgentsResponse {
  agents: RunableAgentResponse[];
  total: number;
  page: number;
  per_page: number;
}

export interface RunableApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Dashboard/UI Types
// ============================================================================

export interface AgentSummary {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  lastExecution?: {
    status: ExecutionStatus;
    completedAt: Date;
    actionsCount: number;
  };
  metrics?: {
    totalExecutions: number;
    successRate: number;
    totalActionsTaken: number;
  };
}

export interface ExecutionHistory {
  executionId: string;
  status: ExecutionStatus;
  completedAt?: Date;
  actionsCount: number;
  errors?: string[];
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number; // seconds
    totalActionsTaken: number;
    successRate: number; // percentage
  };
  trend?: {
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  };
}
