/**
 * Shopify Product Webhook Handler
 *
 * Triggered when products are created/updated
 * Executes Runable agents that handle product events
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyShopifyWebhook } from '@/lib/shopify/webhooks';
import { handleWebhookTrigger } from '@/lib/runable/executor';

// ============================================================================
// POST /api/webhooks/shopify/products/create
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256') || '';
    const topic = request.headers.get('x-shopify-topic') || '';

    // Verify Shopify signature
    const isValid = verifyShopifyWebhook(body, signature);
    if (!isValid) {
      console.warn('[Shopify] Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);

    // Determine event type
    let eventType = '';
    if (topic === 'products/create') {
      eventType = 'product:created';
    } else if (topic === 'products/update') {
      eventType = 'product:updated';
    } else {
      console.log(`[Shopify] Ignoring topic: ${topic}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`[Shopify] Received webhook: ${eventType}`, {
      productId: payload.id,
      title: payload.title
    });

    // Find store by shop domain
    const domain = payload?.shop?.myshopify_domain || '';

    const store = await prisma.store.findUnique({
      where: { shopDomain: domain }
    });

    if (!store) {
      console.warn(`[Shopify] Store not found for domain: ${domain}`);
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Prepare product data for agents
    const productData = {
      id: String(payload.id),
      title: payload.title || '',
      description: payload.body_html || '',
      image: payload.image?.src || '',
      price: payload.variants?.[0]?.price || 0,
      variants: payload.variants || [],
      timestamp: new Date().toISOString()
    };

    // Trigger agents
    const results = await handleWebhookTrigger(store.id, eventType, {
      newProducts: [productData]
    });

    console.log(`[Shopify] Triggered ${results.length} agents for ${eventType}`);

    // Return success
    return NextResponse.json({
      success: true,
      eventType,
      agentsTriggered: results.length,
      product: {
        id: payload.id,
        title: payload.title
      }
    });
  } catch (error) {
    console.error('[Shopify] Webhook processing error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
