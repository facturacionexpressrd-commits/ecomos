import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";

const INVITATION_TTL_DAYS = 7;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const body = (await request.json()) as { email?: string; roleId?: string; storeId?: string };
  if (!body.email || !body.roleId) {
    return new Response("email and roleId are required", { status: 400 });
  }

  try {
    await requireOrgCapability(user.id, CAPABILITIES.orgManageUsers);
  } catch (err) {
    if (err instanceof ForbiddenError) return new Response(err.message, { status: 403 });
    throw err;
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const role = await prisma.role.findUniqueOrThrow({ where: { id: body.roleId } });
  if (role.organizationId !== dbUser.organizationId) {
    return new Response("Role does not belong to your organization", { status: 400 });
  }

  const invitation = await prisma.invitation.create({
    data: {
      organizationId: dbUser.organizationId,
      email: body.email,
      roleId: role.id,
      storeId: body.storeId,
      token: randomBytes(24).toString("base64url"),
      invitedBy: dbUser.id,
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: dbUser.organizationId,
      userId: dbUser.id,
      storeId: body.storeId,
      action: "invitation.created",
      metadata: { email: body.email, roleId: role.id },
    },
  });

  return Response.json({
    token: invitation.token,
    acceptUrl: `${process.env.SHOPIFY_APP_URL}/invite/${invitation.token}`,
  });
}
