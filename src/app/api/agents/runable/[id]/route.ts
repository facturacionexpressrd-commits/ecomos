/**
 * Runable Agent Detail API
 *
 * GET /api/agents/runable/[id] - Get single agent + history
 * PATCH /api/agents/runable/[id] - Update agent (pause, resume, edit config)
 * DELETE /api/agents/runable/[id] - Delete agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireActiveBusiness } from '@/lib/auth/capabilities';
import {
  getAgentById,
  updateAgent,
  deleteAgent,
  getExecutionHistory,
  getAgentActions,
  getAgentMetrics
} from '@/lib/runable/db';
import {
  validateUpdateAgentRequest,
  createErrorResponse,
  ValidationError
} from '@/lib/runable/validation';

// ============================================================================
// GET /api/agents/runable/[id] - Get Agent Detail
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify auth
    const business = await requireActiveBusiness();
    if (!business.storeId) {
      return NextResponse.json(
        { error: { code: 'NO_STORE', message: 'No active store selected' } },
        { status: 400 }
      );
    }

    // 2. Fetch agent
    const agent = await getAgentById(id, business.storeId);
    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Agent not found' } },
        { status: 404 }
      );
    }

    // 3. Fetch related data
    const [executions, actions, metrics] = await Promise.all([
      getExecutionHistory(id, 10),
      getAgentActions(id, 10),
      getAgentMetrics(business.storeId, id)
    ]);

    // 4. Return agent with history
    return NextResponse.json({
      agent: {
        id: agent.id,
        agentId: agent.agentId,
        agentName: agent.agentName,
        agentType: agent.agentType,
        status: agent.status,
        config: agent.config,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      },
      executions: executions.map(e => ({
        executionId: e.executionId,
        status: e.status,
        metaActionsCount: e.metaActionsCount,
        completedAt: e.completedAt,
        createdAt: e.createdAt
      })),
      recentActions: actions.map(a => ({
        id: a.id,
        actionType: a.actionType,
        targetId: a.targetId,
        status: a.status,
        createdAt: a.createdAt
      })),
      metrics
    });
  } catch (error) {
    console.error('GET /api/agents/runable/[id] error:', error);

    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

// ============================================================================
// PATCH /api/agents/runable/[id] - Update Agent
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify auth
    const business = await requireActiveBusiness();
    if (!business.storeId) {
      return NextResponse.json(
        { error: { code: 'NO_STORE', message: 'No active store selected' } },
        { status: 400 }
      );
    }

    // 2. Verify agent exists and belongs to user's store
    const agent = await getAgentById(id, business.storeId);
    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Agent not found' } },
        { status: 404 }
      );
    }

    // 3. Parse and validate request
    const body = await request.json();
    const validated = validateUpdateAgentRequest(body);

    // 4. Update in database
    const updated = await updateAgent(id, business.storeId, validated);

    // 5. Return updated agent
    return NextResponse.json({
      agent: {
        id: updated.id,
        agentId: updated.agentId,
        agentName: updated.agentName,
        agentType: updated.agentType,
        status: updated.status,
        config: updated.config,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('PATCH /api/agents/runable/[id] error:', error);

    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

// ============================================================================
// DELETE /api/agents/runable/[id] - Delete Agent
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Verify auth
    const business = await requireActiveBusiness();
    if (!business.storeId) {
      return NextResponse.json(
        { error: { code: 'NO_STORE', message: 'No active store selected' } },
        { status: 400 }
      );
    }

    // 2. Verify agent exists and belongs to user's store
    const agent = await getAgentById(id, business.storeId);
    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Agent not found' } },
        { status: 404 }
      );
    }

    // 3. Delete agent
    await deleteAgent(id, business.storeId);

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/agents/runable/[id] error:', error);

    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
