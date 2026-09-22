import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants } from "@/lib/auth/capabilities";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileTopBar from "@/components/dashboard/MobileTopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
        <div className="px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8">{children}</div>
      </div>
    </div>
  );
}
