import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants } from "@/lib/auth/capabilities";
import Nav from "@/components/dashboard/Nav";

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
    <>
      <Nav stores={stores} />
      {children}
    </>
  );
}
