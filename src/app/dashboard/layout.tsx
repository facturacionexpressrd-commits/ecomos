import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants } from "@/lib/auth/capabilities";
import { billingEnabled, userHasAccess } from "@/lib/billing";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileTopBar from "@/components/dashboard/MobileTopBar";
import HeroBanner from "@/components/dashboard/HeroBanner";
import TopBar from "@/components/dashboard/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pages are gated here; API routes are gated in src/proxy.ts with the same check.
  if (billingEnabled() && !(await userHasAccess(user.id))) redirect("/billing");

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
      <Sidebar />
      <MobileTopBar />
      <div className="relative z-10 px-3 pt-3 pb-16 sm:px-4 lg:pt-4 lg:pr-4 lg:pl-24">
        {/* The banner is absolutely positioned; the top bar and page flow over its lower half. */}
        <div className="relative">
          <HeroBanner />
          <div className="relative px-3 pt-4 sm:px-6 lg:px-8 lg:pt-5">
            <TopBar stores={stores} email={user.email ?? ""} />
            <div className="pt-16 lg:pt-20">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
