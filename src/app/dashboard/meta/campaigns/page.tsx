import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import CampaignsTable from "@/components/campaigns/CampaignsTable";
import { PageHeader, EmptyState } from "@/components/dashboard/ui/PageHeader";

export const metadata = {
  title: "Campaigns | EcomOS",
};

export default async function CampaignsPage({
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
      <div className="mx-auto max-w-6xl">
        <PageHeader eyebrow="Advertising" title="Campaigns" subtitle="Launch, manage and optimize your ad spend." />
        <EmptyState title="No store access yet">Contact your admin to grant access.</EmptyState>
      </div>
    );
  }

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Advertising" title="Meta Campaigns" subtitle="Performance, ROAS and profitability for every Meta campaign." />
      <CampaignsTable storeId={storeId} />
    </div>
  );
}
