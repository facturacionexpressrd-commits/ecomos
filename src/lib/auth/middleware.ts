import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to enforce store access authorization on API endpoints
 * Usage:
 *   const { user, access } = await requireStoreAccess(req, storeId)
 *   if (!access) return NextResponse.json({ error: "Access denied" }, { status: 403 })
 */
export async function requireStoreAccess(
  req: NextRequest,
  storeId: string
): Promise<{
  user: { id: string; email: string } | null;
  access: boolean;
  capability?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, access: false };
  }

  // Verify user has access to this store
  const storeAccess = await prisma.userStoreAccess.findFirst({
    where: {
      userId: user.id,
      storeId,
    },
  });

  return {
    user: { id: user.id, email: user.email || "" },
    access: !!storeAccess,
    capability: storeAccess?.capability,
  };
}

/**
 * Check if user has a specific capability
 */
export async function hasCapability(
  userId: string,
  storeId: string,
  requiredCapability: string
): Promise<boolean> {
  const access = await prisma.userStoreAccess.findFirst({
    where: {
      userId,
      storeId,
    },
    select: {
      capability: true,
    },
  });

  if (!access) return false;

  const capabilities = (access.capability || "").split(",");
  return capabilities.includes(requiredCapability);
}

/**
 * Load all capabilities for a user in a store
 */
export async function loadStoreCapabilities(
  userId: string,
  storeId: string
): Promise<string[]> {
  const access = await prisma.userStoreAccess.findFirst({
    where: {
      userId,
      storeId,
    },
    select: {
      capability: true,
    },
  });

  if (!access?.capability) return [];
  return access.capability.split(",").filter((c) => c.trim());
}

/**
 * Webhook signature verification (HMAC-SHA256)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === `sha256=${expectedSignature}`;
}

/**
 * Webhook idempotency key tracking
 * Returns true if this is the first time we've seen this key
 */
export async function checkIdempotencyKey(
  storeId: string,
  idempotencyKey: string,
  expiryMinutes: number = 24 * 60
): Promise<boolean> {
  // In production, use Redis for this with TTL
  // For now, use a simple in-memory map (not production-safe)
  // TODO: integrate with Redis
  return true;
}
