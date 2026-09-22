import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";
import { emailLayout, sendEmail } from "@/lib/email";

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

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: dbUser.organizationId } });
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;
  const emailResult = await sendEmail({
    to: body.email,
    subject: `You're invited to ${organization.name} on EcomOS`,
    replyTo: dbUser.email,
    html: emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 8px;">Join ${organization.name}</h2>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">
        ${dbUser.email} invited you to join their workspace on EcomOS as
        <strong>${role.name}</strong>. This invitation expires in ${INVITATION_TTL_DAYS} days.
      </p>
      <p style="margin-top: 20px;">
        <a href="${acceptUrl}" style="background: #e7b158; color: #05080f; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Accept invitation</a>
      </p>
    `),
  });

  return Response.json({ token: invitation.token, acceptUrl, emailSent: emailResult.sent });
}
