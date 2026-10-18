import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store: requestedStoreId } = await searchParams;
  const t = await getT();
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">{t("common.noAccessStore")}</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl rounded-[1.35rem] bg-[#f2f3ef] p-4 text-[#171914] shadow-[0_24px_80px_-36px_rgba(0,0,0,.55)] sm:p-6 xl:p-8">
      <header className="mb-6 border-b border-[#dfe1d9] pb-5">
        <p className="mb-2 text-[10px] font-bold tracking-[.18em] text-[#66705a]">{t("research.eyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">{t("research.title")}</h1>
        <p className="mt-1 text-sm text-[#65695f]">{t("research.subtitle")}</p>
        <span className="sr-only">{locale === "en" ? "Product discovery workspace" : "Espacio de descubrimiento de productos"}</span>
      </header>
      <ResearchWorkspace storeId={storeId} />
    </div>
  );
}
