import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import AgentPlayground from "@/components/agents/AgentPlayground";

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

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="EcomOS Operator"
        title="Prueba tu agente"
        subtitle={store?.name ? `Explora oportunidades guardadas para ${store.name} con Product Scout.` : "Prueba Product Scout con oportunidades guardadas en tu tienda."}
      />
      <AgentPlayground storeId={storeId} />
    </div>
  );
}
