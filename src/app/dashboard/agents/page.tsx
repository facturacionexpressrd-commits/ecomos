import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import AgentChat from "@/components/agents/AgentChat";
import AgentPlayground from "@/components/agents/AgentPlayground";
import { AGENT_SKILLS } from "@/lib/agents/permissions";
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
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">
        {t("common.noAccessStore")}
      </div>
    );
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { name: true },
  });
  const storeName = store?.name ?? t("agents.yourStore");

  // Se pasan las claves: el componente de cliente las traduce al idioma activo.
  const unavailableSkills = AGENT_SKILLS.filter((skill) => !skill.available).map((skill) => ({
    nameKey: skill.nameKey,
    descriptionKey: skill.descriptionKey,
    permission: skill.defaultPermission,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="EcomOS Operator"
        title={t("agents.title")}
        subtitle={t("agents.subtitle", { store: storeName })}
      />
      <AgentChat storeId={storeId} storeName={storeName} unavailableSkills={unavailableSkills} />

      <div>
        <h2 className="mb-3 px-1 text-sm font-medium text-hi">{t("agents.rankingHeading")}</h2>
        <AgentPlayground storeId={storeId} />
      </div>
    </div>
  );
}
