import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store: requestedStoreId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Grow"
        title="Product research"
        subtitle="Score supplier products by margin, shipping cost and competition before you list them."
      />
      <ResearchWorkspace storeId={storeId} />
    </div>
  );
}
