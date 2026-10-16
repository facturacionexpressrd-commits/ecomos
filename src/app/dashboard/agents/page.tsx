import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import AgentChat from "@/components/agents/AgentChat";
import AgentPlayground from "@/components/agents/AgentPlayground";
import { AGENT_SKILLS } from "@/lib/agents/permissions";

export default async function AgentsPage({
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
  if (grants.length === 0) redirect("/dashboard");

  const storeId =
    requestedStoreId && grants.some((grant) => grant.storeId === requestedStoreId)
      ? requestedStoreId
      : grants[0].storeId;

  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">
        No tienes acceso a esta tienda.
      </div>
    );
  }

  const store = await prisma.store.findFirst({
    where: { id: storeId },
    select: { name: true },
  });
  const storeName = store?.name ?? "tu tienda";

  const unavailableSkills = AGENT_SKILLS.filter((skill) => !skill.available).map((skill) => ({
    name: skill.name,
    description: skill.description,
    permission: skill.defaultPermission,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="EcomOS Operator"
        title="Habla con tu agente"
        subtitle={`Consulta y analiza los datos de ${storeName} en lenguaje natural con Product Scout.`}
      />
      <AgentChat storeId={storeId} storeName={storeName} unavailableSkills={unavailableSkills} />

      <div>
        <h2 className="mb-3 px-1 text-sm font-medium text-hi">
          Ranking directo de oportunidades guardadas
        </h2>
        <AgentPlayground storeId={storeId} />
      </div>
    </div>
  );
}
