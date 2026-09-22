import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ConnectMetaButton from "@/components/meta/ConnectMetaButton";
import { PageHeader, StatusPill } from "@/components/dashboard/ui/PageHeader";
import { ShoppingBag, Megaphone } from "lucide-react";

const SOON = ["Google Ads", "TikTok Ads", "Pinterest Ads", "Email (Klaviyo)"];

export default async function IntegrationsPage({
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

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const metaAccount = await prisma.metaAccount.findFirst({ where: { storeId } });
  const shopifyConnected = store.status === "connected" && !!store.accessTokenEncrypted;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Connections" title="Integrations" subtitle="Connect external platforms to EcomOS." />

      <section className="glass rise-in mb-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
              <ShoppingBag size={20} className="text-hi" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-hi">Shopify</h2>
              <p className="mt-0.5 font-mono text-xs text-lo">{store.shopDomain}</p>
              {store.connectedAt && (
                <p className="mt-2 text-xs text-faint">Connected {store.connectedAt.toLocaleDateString()}</p>
              )}
            </div>
          </div>
          <StatusPill status={shopifyConnected ? "connected" : store.status} />
        </div>
      </section>

      <section className="glass rise-in p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
            <Megaphone size={20} className="text-hi" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-medium text-hi">Meta Ads</h2>
            <p className="text-sm text-lo">Track ad campaigns and calculate ROAS</p>
          </div>
        </div>

        {metaAccount ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-lg bg-white/5 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-faint">Business ID</p>
                <p className="mt-0.5 font-mono text-hi">{metaAccount.metaBusinessId}</p>
              </div>
              <div>
                <p className="text-xs text-faint">Status</p>
                <p className="mt-0.5"><StatusPill status={metaAccount.status} /></p>
              </div>
              <div>
                <p className="text-xs text-faint">{metaAccount.lastSyncedAt ? "Last synced" : "Connected"}</p>
                <p className="mt-0.5 text-hi">
                  {(metaAccount.lastSyncedAt ?? metaAccount.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/meta/campaigns"
                className="flex-1 rounded-lg bg-gradient-to-b from-gold-hi to-gold px-4 py-2.5 text-center text-sm font-medium text-ink transition-opacity hover:opacity-90"
              >
                View campaigns
              </Link>
              <button
                disabled
                className="flex-1 cursor-not-allowed rounded-lg border border-line-hi px-4 py-2.5 text-sm font-medium text-faint"
              >
                Disconnect (coming soon)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-lo">Connect your Meta Business account to sync ad campaigns and track ROAS.</p>
            <ConnectMetaButton storeId={storeId} />
          </div>
        )}
      </section>

      <section className="mt-6">
        <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">Coming soon</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOON.map((name) => (
            <div key={name} className="glass flex items-center justify-between p-4 opacity-50">
              <p className="text-sm font-medium text-hi">{name}</p>
              <span className="text-xs text-faint">Phase 3+</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
