import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ConnectMetaButton from "@/components/meta/ConnectMetaButton";

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

  const storeId = requestedStoreId ?? grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="p-4 text-red-600">No access to this store</div>;
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const metaAccount = await prisma.metaAccount.findFirst({
    where: { storeId },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-sm text-gray-600">Connect external platforms to EcomOS</p>
      </div>

      {/* Shopify (always connected) */}
      <section className="mb-8 rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Shopify</h2>
            <p className="text-sm text-gray-600">
              Store: <code className="font-mono">{store.shopDomain}</code>
            </p>
            <p className="mt-2 text-sm">Connected on {store.connectedAt?.toLocaleDateString()}</p>
          </div>
          <div className="rounded bg-green-200 px-3 py-1 text-sm font-medium text-green-800">
            ✓ Connected
          </div>
        </div>
      </section>

      {/* Meta Ads */}
      <section className="rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Meta Ads</h2>
          <p className="text-sm text-gray-600">Track ad campaigns and calculate ROAS</p>
        </div>

        {metaAccount ? (
          <div className="space-y-4">
            <div className="rounded bg-blue-50 p-4">
              <p className="text-sm">
                <strong>Business ID:</strong>{" "}
                <code className="font-mono">{metaAccount.metaBusinessId}</code>
              </p>
              <p className="mt-2 text-sm">
                <strong>Status:</strong> <span className="font-medium">{metaAccount.status}</span>
              </p>
              <p className="mt-2 text-sm">
                <strong>Connected:</strong> {metaAccount.createdAt.toLocaleDateString()}
              </p>
              {metaAccount.lastSyncedAt && (
                <p className="mt-2 text-sm">
                  <strong>Last Synced:</strong> {metaAccount.lastSyncedAt.toLocaleString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Link
                href="/dashboard/meta/campaigns"
                className="block w-full rounded bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
              >
                View Campaigns
              </Link>
              <button
                disabled
                className="w-full rounded bg-gray-300 px-4 py-2 font-medium text-gray-600"
              >
                Disconnect Meta (coming soon)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Meta Business account to sync ad campaigns and track ROAS.
            </p>
            <ConnectMetaButton storeId={storeId} />
          </div>
        )}
      </section>

      {/* Coming Soon */}
      <section className="mt-8 space-y-4">
        <h3 className="font-semibold">Coming Soon</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {["Google Ads", "TikTok Ads", "Pinterest Ads", "Email (Klaviyo)"].map((name) => (
            <div key={name} className="rounded border border-gray-200 p-4 opacity-50">
              <p className="font-medium">{name}</p>
              <p className="text-xs text-gray-500">Phase 3+</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
