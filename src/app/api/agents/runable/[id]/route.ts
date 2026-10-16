/**
 * Runable Agent Detail API
 *
 * GET /api/agents/runable/[id] - Get single agent + history
 * PATCH /api/agents/runable/[id] - Update agent (pause, resume, edit config)
 * DELETE /api/agents/runable/[id] - Delete agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStoreAccess, CAPABILITIES } from '@/lib/auth/capabilities';
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
  createErrorResponse
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

    // 1. Authenticate and check the capability before touching any data.
    const { storeId } = await requireStoreAccess(
      CAPABILITIES.storeRead,
      new URL(request.url).searchParams.get('storeId') ?? undefined
    );

    // 2. Fetch agent
    const agent = await getAgentById(id, storeId);
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
      getAgentMetrics(storeId, id)
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

    // 1. Parse the body first: it may carry the store this request acts on.
    const body = await request.json();

    // 2. Authenticate and check the capability. Updating an agent pauses, resumes or
    //    reconfigures Meta campaign automation, so read access is not enough.
    const { storeId } = await requireStoreAccess(
      CAPABILITIES.campaignsManage,
      typeof body?.storeId === 'string' ? body.storeId : undefined
    );

    // 3. Verify agent exists and belongs to that store
    const agent = await getAgentById(id, storeId);
    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Agent not found' } },
        { status: 404 }
      );
    }

    // 4. Validate the request
    const validated = validateUpdateAgentRequest(body);

    // 5. Update in database
    const updated = await updateAgent(id, storeId, validated);

    // 6. Return updated agent
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

    // 1. Authenticate and check the capability before touching any data.
    const { storeId } = await requireStoreAccess(
      CAPABILITIES.campaignsManage,
      new URL(request.url).searchParams.get('storeId') ?? undefined
    );

    // 2. Verify agent exists and belongs to user's store
    const agent = await getAgentById(id, storeId);
    if (!agent) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Agent not found' } },
        { status: 404 }
      );
    }

    // 3. Delete agent
    await deleteAgent(id, storeId);

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
