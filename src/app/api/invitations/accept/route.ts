import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { token } = (await request.json()) as { token?: string };
  if (!token) return new Response("token is required", { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return new Response("Invitation not found", { status: 404 });
  if (invitation.status !== "pending") return new Response("Invitation already used", { status: 409 });
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
    return new Response("Invitation expired", { status: 410 });
  }
  if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    return new Response("This invitation was sent to a different email address", { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: user.id },
      create: { id: user.id, organizationId: invitation.organizationId, email: user.email! },
      update: {},
    });

    if (invitation.storeId) {
      await tx.userStoreAccess.upsert({
        where: { userId_storeId: { userId: user.id, storeId: invitation.storeId } },
        create: { userId: user.id, storeId: invitation.storeId, roleId: invitation.roleId },
        update: { roleId: invitation.roleId },
      });
    }

    await tx.invitation.update({ where: { id: invitation.id }, data: { status: "accepted" } });

    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        storeId: invitation.storeId,
        action: "invitation.accepted",
        metadata: { invitationId: invitation.id },
      },
    });
  });

  return Response.json({ ok: true, storeId: invitation.storeId });
}
