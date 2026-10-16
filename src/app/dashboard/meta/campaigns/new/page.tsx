import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import CampaignWizard from "@/components/campaigns/CampaignWizard";
import { ACTIVE_META } from "@/lib/meta/status";
import { getT } from "@/lib/i18n/server";

export const metadata = {
  title: "Create Campaign | EcomOS",
};

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const { storeId: requestedStoreId } = await searchParams;

  const t = await getT();

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
    return <div className="p-4 text-coral">{t("newCampaign.noAccess")}</div>;
  }

  // Verify Meta account is connected
  const metaAccount = await prisma.metaAccount.findFirst({ where: { storeId, ...ACTIVE_META } });

  if (!metaAccount) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-gold/30 bg-gold/15 p-6 text-center">
          <h1 className="text-xl font-bold text-gold-hi">{t("newCampaign.notConnected.title")}</h1>
          <p className="mt-2 text-gold-hi">{t("newCampaign.notConnected.body")}</p>
          <a
            href="/dashboard/integrations"
            className="mt-4 inline-block rounded bg-gold px-4 py-2 font-medium text-ink hover:bg-gold-hi"
          >
            {t("newCampaign.goIntegrations")}
          </a>
        </div>
      </div>
    );
  }

  return <CampaignWizard storeId={storeId} />;
}
