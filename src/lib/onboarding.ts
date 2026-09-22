import { prisma } from "@/lib/db";
import { CAPABILITIES, OWNER_CAPABILITIES } from "@/lib/auth/capabilities";

// A second role so invites have somewhere to land besides full ownership: read-only across the
// board plus AI tools, none of the capabilities that spend money or change access.
const MEMBER_CAPABILITIES: string[] = [CAPABILITIES.storeRead, CAPABILITIES.ordersRead, CAPABILITIES.aiGenerate];

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
      await tx.role.create({ data: { organizationId: org.id, name: "Member", capabilities: MEMBER_CAPABILITIES } });
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

export type DeleteWorkspaceResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "name_mismatch" };

/**
 * Deletes the caller's entire workspace: every store, product, order, campaign, teammate and
 * audit log — verified against the schema to cascade fully from Organization, nothing orphaned.
 * Requires typing the exact workspace name as a confirmation, the standard pattern for an
 * action this irreversible. Deliberately does NOT touch the caller's Supabase login — this
 * deletes the workspace's data, not their account credentials.
 */
export async function deleteWorkspace(input: { userId: string; confirmName: string }): Promise<DeleteWorkspaceResult> {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { organizationId: true } });
  if (!user) return { ok: false, reason: "not_found" };

  const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!org) return { ok: false, reason: "not_found" };
  if (input.confirmName.trim() !== org.name) return { ok: false, reason: "name_mismatch" };

  await prisma.organization.delete({ where: { id: org.id } });
  return { ok: true };
}
