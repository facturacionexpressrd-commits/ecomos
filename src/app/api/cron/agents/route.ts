/**
 * Cron Job: Execute Runable Agents
 *
 * Scheduled to run every hour to:
 * - Monitor campaign performance
 * - Make optimization decisions
 * - Auto-pause underperformers
 * - Auto-scale winners
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/supabase/server';
import { executeStoreAgents } from '@/lib/runable/executor';

/**
 * Verify cron authentication
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.VERCEL_CRON_SECRET;

  if (!cronSecret) {
    console.warn('VERCEL_CRON_SECRET not configured');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === cronSecret;
}

// ============================================================================
// GET /api/cron/agents - Execute hourly agent monitoring
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting agent execution cycle');

    // Fetch all stores with active Runable agents
    const storesWithAgents = await prisma.store.findMany({
      select: { id: true },
      where: {
        runableAgents: {
          some: { status: 'active' }
        }
      }
    });

    console.log(`[Cron] Found ${storesWithAgents.length} stores with active agents`);

    // Execute agents for each store
    const results = [];
    for (const store of storesWithAgents) {
      try {
        const storeResults = await executeStoreAgents(store.id, 'schedule');
        results.push({
          storeId: store.id,
          executionsCount: storeResults.length,
          completed: storeResults.filter(r => r.status === 'completed').length,
          failed: storeResults.filter(r => r.status === 'failed').length
        });
      } catch (error) {
        console.error(`[Cron] Error executing agents for store ${store.id}:`, error);
        results.push({
          storeId: store.id,
          error: String(error)
        });
      }
    }

    console.log('[Cron] Agent execution cycle complete');

    // Return summary
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stores_processed: storesWithAgents.length,
      results
    });
  } catch (error) {
    console.error('[Cron] Unhandled error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Configure Vercel Cron (in vercel.json)
// ============================================================================
/*
In vercel.json, add:

"crons": [
  {
    "path": "/api/cron/agents",
    "schedule": "0 * * * *"  // Every hour
  }
]

And in Vercel dashboard environment variables, add:
VERCEL_CRON_SECRET=[generate-random-secret]
*/
