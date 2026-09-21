import { prisma } from "@/lib/db";
import { OWNER_CAPABILITIES } from "@/lib/auth/capabilities";

export function cleanWorkspaceName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 80 ? name : null;
}

/** Idempotent: a user who already has a workspace keeps it, so a double-submit can't make two. */
export async function createWorkspace(input: { userId: string; email: string; name: string }) {
  const existing = await prisma.user.findUnique({ where: { id: input.userId }, select: { organizationId: true } });
  if (existing) return { created: false, organizationId: existing.organizationId };

  try {
    const organizationId = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: input.name } });
      await tx.user.create({ data: { id: input.userId, organizationId: org.id, email: input.email } });
      await tx.role.create({ data: { organizationId: org.id, name: "Owner", capabilities: OWNER_CAPABILITIES } });
      await tx.auditLog.create({
        data: { organizationId: org.id, userId: input.userId, action: "workspace.created", metadata: { name: input.name } },
      });
      return org.id;
    });
    return { created: true, organizationId };
  } catch (err) {
    // Two concurrent submits: the loser hits the unique user id, so return the winner's workspace.
    const raced = await prisma.user.findUnique({ where: { id: input.userId }, select: { organizationId: true } });
    if (raced) return { created: false, organizationId: raced.organizationId };
    throw err;
  }
}
