import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import AgentWorkbench from "@/components/agents/AgentWorkbench";
import AgentPlayground from "@/components/agents/AgentPlayground";
import { getT } from "@/lib/i18n/server";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: requestedStoreId } = await searchParams;
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId =
    requestedStoreId && grants.some((grant) => grant.storeId === requestedStoreId)
      ? requestedStoreId
      : grants[0].storeId;

  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">
        {t("common.noAccessStore")}
      </div>
    );
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { name: true },
  });
  const storeName = store?.name ?? t("agents.yourStore");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="EcomOS Operator"
        title={t("agents.title")}
        subtitle={t("agents.subtitle", { store: storeName })}
      />
      <AgentWorkbench storeId={storeId} storeName={storeName} />

      <div>
        <h2 className="mb-3 px-1 text-sm font-medium text-neutral-900">
          {t("agents.rankingHeading")}
        </h2>
        <AgentPlayground storeId={storeId} />
      </div>
    </div>
  );
}
