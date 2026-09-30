/**
 * Runable Agents API
 *
 * POST /api/agents/runable - Create new agent
 * GET /api/agents/runable - List agents for store
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireActiveBusiness } from '@/lib/auth/capabilities';
import { createAgent, listAgents } from '@/lib/runable/db';
import {
  validateCreateAgentRequest,
  createErrorResponse
} from '@/lib/runable/validation';
import { runableClient } from '@/lib/runable/client';

// ============================================================================
// POST /api/agents/runable - Create Agent
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Verify auth
    const business = await requireActiveBusiness();
    if (!business.storeId) {
      return NextResponse.json(
        { error: { code: 'NO_STORE', message: 'No active store selected' } },
        { status: 400 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validated = validateCreateAgentRequest(body);

    // 3. Create agent in Runable AI
    let runableAgent;
    try {
      runableAgent = await runableClient.createAgent({
        name: validated.agentName,
        type: validated.agentType,
        config: validated.config,
        webhook_url: `${process.env.RUNABLE_CALLBACK_URL || 'http://localhost:3000/api/runable/webhook'}`
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: 'RUNABLE_API_ERROR',
            message: `Failed to create agent in Runable: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        },
        { status: 502 }
      );
    }

    // 4. Store in database
    const agent = await createAgent(
      business.storeId,
      runableAgent.id,
      validated.agentName,
      validated.agentType,
      validated.config,
      validated.runableApiKey
    );

    // 5. Return created agent
    return NextResponse.json(
      {
        agent: {
          id: agent.id,
          agentId: agent.agentId,
          agentName: agent.agentName,
          agentType: agent.agentType,
          status: agent.status,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/agents/runable error:', error);

    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

// ============================================================================
// GET /api/agents/runable - List Agents
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Verify auth
    const business = await requireActiveBusiness();
    if (!business.storeId) {
      return NextResponse.json(
        { error: { code: 'NO_STORE', message: 'No active store selected' } },
        { status: 400 }
      );
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));

    // 3. Fetch from database
    const { agents, total } = await listAgents(business.storeId, page, limit);

    // 4. Return list
    return NextResponse.json({
      agents: agents.map(agent => ({
        id: agent.id,
        agentId: agent.agentId,
        agentName: agent.agentName,
        agentType: agent.agentType,
        status: agent.status,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/agents/runable error:', error);

    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
