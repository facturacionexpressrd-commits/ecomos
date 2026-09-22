import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants } from "@/lib/auth/capabilities";
import { billingEnabled, hasAccess } from "@/lib/billing";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileTopBar from "@/components/dashboard/MobileTopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ponytail: gates the dashboard UI only; API routes don't re-check the subscription. Add the
  // same check to spend-money routes (Meta writes, AI) if a lapsed workspace is ever seen using them.
  if (billingEnabled()) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organization: { select: { subscriptionStatus: true } } },
    });
    if (dbUser && !hasAccess(dbUser.organization.subscriptionStatus)) redirect("/billing");
  }

  const grants = await loadStoreAccessGrants(user.id);
  const stores =
    grants.length === 0
      ? []
      : await prisma.store.findMany({
          where: { id: { in: grants.map((g) => g.storeId) } },
          select: { id: true, name: true, status: true },
          orderBy: { name: "asc" },
        });

  return (
    <div className="min-h-screen">
      <Sidebar stores={stores} />
      <MobileTopBar />
      <div className="relative z-10 lg:pl-[17.5rem]">
        <div className="px-4 pt-4 pb-16 sm:px-6 lg:px-8 lg:pt-5">{children}</div>
      </div>
    </div>
  );
}
