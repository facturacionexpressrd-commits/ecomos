import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import CampaignsTable from "@/components/campaigns/CampaignsTable";

export const metadata = {
  title: "Campaigns | EcomOS",
};

export default async function CampaignsPage() {
  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's active store (first store they have access to)
  const userStores = await prisma.userStoreAccess.findMany({
    where: { userId: user.id },
    include: { store: true },
    take: 1,
  });

  if (!userStores.length) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">
            You don't have access to any stores yet. Contact your admin to grant access.
          </p>
        </div>
      </div>
    );
  }

  const storeId = userStores[0].store.id;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Meta Campaigns</h1>
        <p className="mt-2 text-gray-600">
          View performance metrics, ROAS, and profitability for all your Meta campaigns.
        </p>
      </div>

      {/* Campaigns Table */}
      <Suspense fallback={<div className="p-4 text-gray-600">Loading campaigns...</div>}>
        <CampaignsTable storeId={storeId} />
      </Suspense>
    </div>
  );
}
