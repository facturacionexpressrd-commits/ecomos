/**
 * Runable AI Database Operations
 *
 * Handles all database operations for Runable agent management
 * Uses Prisma client for type-safe queries
 */

import { prisma } from '@/lib/db';
import { encrypt, decrypt } from './encryption';
import type {
  RunableAgentConfig,
  RunableAgentRecord,
  RunableAgentExecutionRecord,
  RunableAgentActionLogRecord,
  AgentType,
  ExecutionStatus,
  ActionStatus
} from '@/lib/types/runable';

// ============================================================================
// Agent Operations
// ============================================================================

export async function createAgent(
  storeId: string,
  agentId: string,
  agentName: string,
  agentType: AgentType,
  config: RunableAgentConfig,
  runableApiKey: string
): Promise<RunableAgentRecord> {
  const encryptedKey = encrypt(runableApiKey);

  const agent = await prisma.runableAgent.create({
    data: {
      storeId,
      agentId,
      agentName,
      agentType,
      status: 'active',
      config,
      runableApiKeyEncrypted: encryptedKey
    }
  });

  return agent as RunableAgentRecord;
}

export async function getAgent(
  storeId: string,
  agentId: string
): Promise<RunableAgentRecord | null> {
  const agent = await prisma.runableAgent.findFirst({
    where: {
      storeId,
      agentId
    }
  });

  return agent as RunableAgentRecord | null;
}

export async function getAgentById(
  id: string,
  storeId: string
): Promise<RunableAgentRecord | null> {
  const agent = await prisma.runableAgent.findFirst({
    where: {
      id,
      storeId
    }
  });

  return agent as RunableAgentRecord | null;
}

export async function listAgents(
  storeId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ agents: RunableAgentRecord[]; total: number }> {
  const skip = (page - 1) * limit;

  const [agents, total] = await Promise.all([
    prisma.runableAgent.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.runableAgent.count({
      where: { storeId }
    })
  ]);

  return {
    agents: agents as RunableAgentRecord[],
    total
  };
}

export async function updateAgent(
  id: string,
  storeId: string,
  updates: {
    agentName?: string;
    status?: string;
    config?: RunableAgentConfig;
  }
): Promise<RunableAgentRecord> {
  const agent = await prisma.runableAgent.update({
    where: { id },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  });

  return agent as RunableAgentRecord;
}

export async function deleteAgent(
  id: string,
  storeId: string
): Promise<boolean> {
  await prisma.runableAgent.delete({
    where: {
      id
    }
  });

  return true;
}

export async function getAgentWithDecryptedKey(
  id: string,
  storeId: string
): Promise<(RunableAgentRecord & { runableApiKeyDecrypted: string }) | null> {
  const agent = await getAgentById(id, storeId);
  if (!agent) return null;

  const decrypted = decrypt(agent.runableApiKeyEncrypted);

  return {
    ...agent,
    runableApiKeyDecrypted: decrypted
  };
}

// ============================================================================
// Execution Operations
// ============================================================================

export async function createExecution(
  agentId: string,
  executionId: string,
  inputData?: Record<string, any>
): Promise<RunableAgentExecutionRecord> {
  const execution = await prisma.runableAgentExecution.create({
    data: {
      agentId,
      executionId,
      status: 'pending',
      inputData: inputData || {}
    }
  });

  return execution as RunableAgentExecutionRecord;
}

export async function updateExecution(
  executionId: string,
  updates: {
    status?: ExecutionStatus;
    outputData?: Record<string, any>;
    errorMessage?: string;
    metaActionsCount?: number;
    startedAt?: Date;
    completedAt?: Date;
  }
): Promise<RunableAgentExecutionRecord> {
  const execution = await prisma.runableAgentExecution.update({
    where: { executionId },
    data: updates
  });

  return execution as RunableAgentExecutionRecord;
}

export async function getExecution(
  executionId: string
): Promise<RunableAgentExecutionRecord | null> {
  const execution = await prisma.runableAgentExecution.findUnique({
    where: { executionId }
  });

  return execution as RunableAgentExecutionRecord | null;
}

export async function getExecutionHistory(
  agentId: string,
  limit: number = 20
): Promise<RunableAgentExecutionRecord[]> {
  const executions = await prisma.runableAgentExecution.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return executions as RunableAgentExecutionRecord[];
}

// ============================================================================
// Action Log Operations
// ============================================================================

export async function createActionLog(
  agentId: string,
  actionType: string,
  actionData: Record<string, any>,
  targetId?: string
): Promise<RunableAgentActionLogRecord> {
  const log = await prisma.runableAgentActionLog.create({
    data: {
      agentId,
      actionType,
      actionData,
      targetId,
      status: 'success'
    }
  });

  return log as RunableAgentActionLogRecord;
}

export async function updateActionLog(
  id: string,
  updates: {
    status?: ActionStatus;
    errorMessage?: string;
    approvedBy?: string;
    approvedAt?: Date;
  }
): Promise<RunableAgentActionLogRecord> {
  const log = await prisma.runableAgentActionLog.update({
    where: { id },
    data: updates
  });

  return log as RunableAgentActionLogRecord;
}

export async function getAgentActions(
  agentId: string,
  limit: number = 50
): Promise<RunableAgentActionLogRecord[]> {
  const actions = await prisma.runableAgentActionLog.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return actions as RunableAgentActionLogRecord[];
}

export async function getActionsByTargetId(
  targetId: string
): Promise<RunableAgentActionLogRecord[]> {
  const actions = await prisma.runableAgentActionLog.findMany({
    where: { targetId },
    orderBy: { createdAt: 'desc' }
  });

  return actions as RunableAgentActionLogRecord[];
}

// ============================================================================
// Metrics Operations
// ============================================================================

export async function getAgentMetrics(storeId: string, agentId: string) {
  const [executions, actions] = await Promise.all([
    prisma.runableAgentExecution.findMany({
      where: { agentId },
      select: { status: true }
    }),
    prisma.runableAgentActionLog.findMany({
      where: { agentId },
      select: { status: true }
    })
  ]);

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e: typeof executions[number]) => e.status === 'completed').length;
  const failedExecutions = executions.filter((e: typeof executions[number]) => e.status === 'failed').length;
  const successRate = totalExecutions > 0
    ? (successfulExecutions / totalExecutions) * 100
    : 0;

  const successfulActions = actions.filter((a: typeof actions[number]) => a.status === 'success').length;
  const failedActions = actions.filter((a: typeof actions[number]) => a.status === 'failed').length;

  return {
    executions: {
      total: totalExecutions,
      successful: successfulExecutions,
      failed: failedExecutions,
      successRate: Math.round(successRate)
    },
    actions: {
      total: actions.length,
      successful: successfulActions,
      failed: failedActions
    }
  };
}
