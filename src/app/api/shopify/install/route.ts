import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { buildAuthorizeUrl, signState } from "@/lib/shopify/client";

const SHOP_PATTERN = /^[a-zA-Z0-9-]+\.myshopify\.com$/;

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get("shop");
  if (!shop || !SHOP_PATTERN.test(shop)) {
    return new Response("Missing or invalid `shop` query param", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Not authenticated", { status: 401 });
  }

  // Any member of an org can start a connect — per-store access is granted afterward,
  // once the Store row (and its UserStoreAccess grants) actually exist.
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return new Response("No organization for this user", { status: 403 });
  }

  const state = signState(dbUser.organizationId, dbUser.id);
  return Response.redirect(buildAuthorizeUrl(shop, state));
}
