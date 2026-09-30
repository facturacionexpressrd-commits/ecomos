/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Runable AI Validation
 *
 * Request validation and error handling for API endpoints
 */

import type { AgentType, RunableAgentConfig } from '@/lib/types/runable';

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Validation Schemas
// ============================================================================

export function validateAgentType(type: any): type is AgentType {
  return ['campaign_manager', 'product_copy', 'performance_optimizer'].includes(type);
}

export function validateAgentName(name: any): name is string {
  return typeof name === 'string' && name.length >= 1 && name.length <= 255;
}

export function validateAgentConfig(config: any): config is RunableAgentConfig {
  if (typeof config !== 'object' || config === null) {
    return false;
  }

  // Validate campaign_manager config if present
  if (config.campaign_manager) {
    const cm = config.campaign_manager;
    if (typeof cm !== 'object') return false;
    if (typeof cm.min_roas !== 'number' || cm.min_roas < 1) return false;
    if (typeof cm.daily_budget !== 'number' || cm.daily_budget < 1) return false;
    if (typeof cm.max_cpc !== 'number' || cm.max_cpc < 0) return false;
    if (!Array.isArray(cm.target_audiences)) return false;
    if (typeof cm.auto_scaling_enabled !== 'boolean') return false;
    if (typeof cm.pause_on_low_roas !== 'boolean') return false;
  }

  // Validate product_copy config if present
  if (config.product_copy) {
    const pc = config.product_copy;
    if (typeof pc !== 'object') return false;
    if (typeof pc.generate_variations !== 'boolean') return false;
    if (typeof pc.num_variations !== 'number' || pc.num_variations < 1) return false;
    if (!['professional', 'casual', 'playful', 'technical'].includes(pc.tone)) return false;
    if (typeof pc.include_seo_keywords !== 'boolean') return false;
    if (typeof pc.auto_upload_to_meta !== 'boolean') return false;
  }

  // Validate performance_optimizer config if present
  if (config.performance_optimizer) {
    const po = config.performance_optimizer;
    if (typeof po !== 'object') return false;
    if (!['hourly', '6_hourly', 'daily'].includes(po.check_frequency)) return false;
    if (typeof po.budget_increase_threshold !== 'number') return false;
    if (typeof po.budget_decrease_threshold !== 'number') return false;
    if (typeof po.max_budget_increase !== 'number' || po.max_budget_increase < 0) return false;
    if (typeof po.max_budget_decrease !== 'number' || po.max_budget_decrease < 0) return false;
    if (typeof po.alert_on_drop !== 'boolean') return false;
    if (typeof po.alert_threshold !== 'number' || po.alert_threshold < 0) return false;
  }

  return true;
}

export function validateRunableApiKey(key: any): key is string {
  return typeof key === 'string' && key.startsWith('ru_') && key.length > 20;
}

// ============================================================================
// Request Validation
// ============================================================================

export interface CreateAgentRequest {
  agentName: string;
  agentType: AgentType;
  config: RunableAgentConfig;
  runableApiKey: string;
}

export function validateCreateAgentRequest(body: any): CreateAgentRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('body', 'Request body must be a JSON object');
  }

  if (!validateAgentName(body.agentName)) {
    throw new ValidationError('agentName', 'Agent name must be a non-empty string (max 255 chars)');
  }

  if (!validateAgentType(body.agentType)) {
    throw new ValidationError(
      'agentType',
      "Agent type must be one of: 'campaign_manager', 'product_copy', 'performance_optimizer'"
    );
  }

  if (!validateAgentConfig(body.config)) {
    throw new ValidationError('config', 'Invalid agent configuration');
  }

  if (!validateRunableApiKey(body.runableApiKey)) {
    throw new ValidationError(
      'runableApiKey',
      'Invalid Runable API key (must start with ru_ and be at least 20 chars)'
    );
  }

  return {
    agentName: body.agentName,
    agentType: body.agentType,
    config: body.config,
    runableApiKey: body.runableApiKey
  };
}

export interface UpdateAgentRequest {
  agentName?: string;
  status?: string;
  config?: RunableAgentConfig;
}

export function validateUpdateAgentRequest(body: any): UpdateAgentRequest {
  const updates: UpdateAgentRequest = {};

  if (body.agentName !== undefined) {
    if (!validateAgentName(body.agentName)) {
      throw new ValidationError('agentName', 'Agent name must be a non-empty string (max 255 chars)');
    }
    updates.agentName = body.agentName;
  }

  if (body.status !== undefined) {
    if (!['active', 'paused', 'archived'].includes(body.status)) {
      throw new ValidationError('status', "Status must be one of: 'active', 'paused', 'archived'");
    }
    updates.status = body.status;
  }

  if (body.config !== undefined) {
    if (!validateAgentConfig(body.config)) {
      throw new ValidationError('config', 'Invalid agent configuration');
    }
    updates.config = body.config;
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('body', 'At least one field must be updated');
  }

  return updates;
}

// ============================================================================
// Webhook Validation
// ============================================================================

export interface WebhookPayload {
  execution_id: string;
  agent_id: string;
  status: string;
  timestamp: string;
  output?: Record<string, any>;
}

export function validateWebhookPayload(body: any): WebhookPayload {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('body', 'Webhook payload must be a JSON object', 400);
  }

  if (typeof body.execution_id !== 'string') {
    throw new ValidationError('execution_id', 'execution_id must be a string', 400);
  }

  if (typeof body.agent_id !== 'string') {
    throw new ValidationError('agent_id', 'agent_id must be a string', 400);
  }

  if (typeof body.status !== 'string') {
    throw new ValidationError('status', 'status must be a string', 400);
  }

  if (typeof body.timestamp !== 'string') {
    throw new ValidationError('timestamp', 'timestamp must be a string', 400);
  }

  return {
    execution_id: body.execution_id,
    agent_id: body.agent_id,
    status: body.status,
    timestamp: body.timestamp,
    output: body.output
  };
}

// ============================================================================
// Error Response Helpers
// ============================================================================

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export function createErrorResponse(error: unknown): {
  statusCode: number;
  body: ErrorResponse;
} {
  if (error instanceof ValidationError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          field: error.field
        }
      }
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred'
      }
    }
  };
}
