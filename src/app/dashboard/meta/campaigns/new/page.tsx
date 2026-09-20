import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import CampaignWizard from "@/components/campaigns/CampaignWizard";

export const metadata = {
  title: "Create Campaign | EcomOS",
};

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const { storeId: requestedStoreId } = await searchParams;

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's store access
  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) {
    redirect("/dashboard");
  }

  // Use requested store or default to first store
  const storeId = requestedStoreId ?? grants[0].storeId;

  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="p-4 text-red-600">No access to this store</div>;
  }

  // Verify Meta account is connected
  const metaAccount = await prisma.metaAccount.findFirst({
    where: { storeId },
  });

  if (!metaAccount) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <h1 className="text-xl font-bold text-yellow-900">Meta Account Not Connected</h1>
          <p className="mt-2 text-yellow-800">
            You need to connect a Meta Business account before creating campaigns.
          </p>
          <a
            href="/dashboard/integrations"
            className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Go to Integrations
          </a>
        </div>
      </div>
    );
  }

  return <CampaignWizard storeId={storeId} />;
}
