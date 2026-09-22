import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader, EmptyState, StatusPill } from "@/components/dashboard/ui/PageHeader";
import InviteForm from "@/components/team/InviteForm";
import DangerZone from "@/components/team/DangerZone";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: requestedStoreId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }
  const canManage = hasCapability(grants, storeId, CAPABILITIES.orgManageUsers);

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { organization: true } });
  const [members, roles, pendingInvites] = await Promise.all([
    prisma.userStoreAccess.findMany({
      where: { storeId },
      include: { user: true, role: true },
      orderBy: { user: { email: "asc" } },
    }),
    prisma.role.findMany({ where: { organizationId: dbUser.organizationId }, orderBy: { name: "asc" } }),
    prisma.invitation.findMany({
      where: { storeId, status: "pending" },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Workspace" title="Team" subtitle="Who has access to this store." />

      {canManage && (
        <section className="glass rise-in mb-6 p-6">
          <p className="mb-4 text-sm font-medium text-hi">Invite someone</p>
          <InviteForm storeId={storeId} roles={roles.map((r) => ({ id: r.id, name: r.name }))} />
        </section>
      )}

      {pendingInvites.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">Pending invites</p>
          <div className="glass overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-hi">{inv.email}</td>
                    <td className="px-5 py-3 text-lo">{inv.role.name}</td>
                    <td className="px-5 py-3 text-right text-xs text-faint">
                      Expires {inv.expiresAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {members.length === 0 ? (
        <EmptyState title="No members yet">Invite a teammate above.</EmptyState>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-faint uppercase">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 hover:bg-white/3">
                  <td className="px-5 py-3 text-hi">
                    {m.user.name || m.user.email}
                    {m.userId === user.id && <span className="ml-2 text-xs text-faint">(you)</span>}
                  </td>
                  <td className="px-5 py-3 text-lo">{m.role.name}</td>
                  <td className="px-5 py-3 text-right">
                    <StatusPill status="active" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <section className="mt-10">
          <DangerZone workspaceName={dbUser.organization.name} />
        </section>
      )}
    </div>
  );
}
