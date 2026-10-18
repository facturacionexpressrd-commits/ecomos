import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants } from "@/lib/auth/capabilities";
import { billingEnabled, userHasAccess } from "@/lib/billing";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileTopBar from "@/components/dashboard/MobileTopBar";
import TopBar from "@/components/dashboard/TopBar";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (billingEnabled() && !(await userHasAccess(user.id))) redirect("/billing");

  const locale = await getLocale();

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
    <I18nProvider locale={locale}>
      <div data-theme="light" className="min-h-screen bg-white text-neutral-900">
        <Sidebar />
        <MobileTopBar />
        <main className="px-3 pt-3 pb-16 sm:px-4 lg:pt-5 lg:pr-5 lg:pl-64">
          <div className="mx-auto max-w-7xl">
            <TopBar stores={stores} email={user.email ?? ""} />
            <div className="pt-6">{children}</div>
          </div>
        </main>
      </div>
    </I18nProvider>
  );
}
