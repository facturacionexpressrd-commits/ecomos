import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import RevenueCard from "@/components/dashboard/RevenueCard";
import OrdersCard from "@/components/dashboard/OrdersCard";
import InventoryCard from "@/components/dashboard/InventoryCard";

export default async function DashboardPage({
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
  if (grants.length === 0) {
    return (
      <Empty>
        You don&apos;t have access to any store yet. Connect one at{" "}
        <code>/api/shopify/install?shop=your-store.myshopify.com</code>, or ask an org admin
        for an invite.
      </Empty>
    );
  }

  const storeId = requestedStoreId ?? grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <Empty>You don&apos;t have access to this store.</Empty>;
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  const [revenue, orderCount, inventoryTotal, latestOrder] = await Promise.all([
    prisma.order.aggregate({ where: { storeId }, _sum: { totalPrice: true } }),
    prisma.order.count({ where: { storeId } }),
    prisma.inventoryLevel.aggregate({ where: { storeId }, _sum: { available: true } }),
    prisma.order.findFirst({ where: { storeId }, select: { currency: true } }),
  ]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">{store.name}</h1>
        <p className="text-sm text-gray-600">
          {store.status === "connected" ? `Connected ${store.connectedAt?.toLocaleString()}` : store.status}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RevenueCard amount={revenue._sum.totalPrice?.toNumber() ?? 0} currency={latestOrder?.currency ?? "USD"} />
        <OrdersCard count={orderCount} />
        <InventoryCard unitsAvailable={inventoryTotal._sum.available ?? 0} />
      </div>
    </main>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-2 px-4 text-center">
      <p className="text-sm text-gray-600">{children}</p>
    </main>
  );
}
