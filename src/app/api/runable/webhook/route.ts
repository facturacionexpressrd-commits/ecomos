/**
 * Runable AI Webhook Handler
 *
 * POST /api/runable/webhook - Receive execution results from Runable AI
 *
 * Runable calls this endpoint with:
 * - execution_id: ID of the execution
 * - agent_id: ID of the agent in EcomOS
 * - status: 'pending', 'running', 'completed', 'failed'
 * - output: Results of the execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExecution, updateExecution } from '@/lib/runable/db';
import { createActionLog } from '@/lib/runable/db';
import {
  validateWebhookPayload,
  createErrorResponse
} from '@/lib/runable/validation';
import { runableClient } from '@/lib/runable/client';

// ============================================================================
// POST /api/runable/webhook - Webhook Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature
    const signature = request.headers.get('x-runable-signature');
    const rawBody = await request.text();

    if (!signature || !process.env.RUNABLE_WEBHOOK_SECRET) {
      console.warn('Missing webhook signature or secret');
      return NextResponse.json(
        { error: { code: 'MISSING_SIGNATURE', message: 'Webhook signature verification failed' } },
        { status: 401 }
      );
    }

    const isValid = runableClient.verifyWebhookSignature(
      rawBody,
      signature,
      process.env.RUNABLE_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' } },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    const body = JSON.parse(rawBody);
    const payload = validateWebhookPayload(body);

    // 3. Find execution
    const execution = await getExecution(payload.execution_id);
    if (!execution) {
      console.warn(`Execution not found: ${payload.execution_id}`);
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Execution not found' } },
        { status: 404 }
      );
    }

    // 4. Update execution status
    const updates: any = {
      status: payload.status as any,
      completedAt: payload.status === 'completed' || payload.status === 'failed' ? new Date() : undefined
    };

    if (payload.output) {
      updates.outputData = payload.output;
      updates.metaActionsCount = Array.isArray(payload.output.actions_taken)
        ? payload.output.actions_taken.length
        : 0;
    }

    const updated = await updateExecution(payload.execution_id, updates);

    // 5. Log actions if any were taken
    if (payload.output?.actions_taken && Array.isArray(payload.output.actions_taken)) {
      for (const action of payload.output.actions_taken) {
        try {
          await createActionLog(
            execution.agentId,
            action.type,
            action.details,
            action.targetId
          );
        } catch (error) {
          console.error('Failed to log action:', error);
          // Don't fail the webhook for action logging errors
        }
      }
    }

    // 6. Return success
    return NextResponse.json({
      success: true,
      executionId: payload.execution_id,
      status: updated.status
    });
  } catch (error) {
    console.error('POST /api/runable/webhook error:', error);

    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

// ============================================================================
// OPTIONS - CORS preflight
// ============================================================================

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-runable-signature'
      }
    }
  );
}
