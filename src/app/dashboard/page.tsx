import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import RevenueCard from "@/components/dashboard/RevenueCard";
import OrdersCard from "@/components/dashboard/OrdersCard";
import InventoryCard from "@/components/dashboard/InventoryCard";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";

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

  // A signed-in account with no workspace yet is a new sign-up (invitees arrive via their link).
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!account) redirect("/onboarding");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">Connect your Shopify store</h1>
        <p className="text-sm text-gray-600">
          Enter your store&apos;s Shopify address. You&apos;ll approve read access to products, orders,
          customers and inventory on Shopify, then come back here.
        </p>
        <ConnectStoreForm />
        <p className="text-xs text-gray-500">Waiting on an invitation instead? Open the link you were sent.</p>
      </main>
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
