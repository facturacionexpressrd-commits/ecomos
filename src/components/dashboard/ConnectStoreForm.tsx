"use client";

export default function ConnectStoreForm({ compact = false }: { compact?: boolean }) {
  return (
    <form method="GET" action="/api/shopify/install" className={compact ? "flex gap-2" : "flex flex-col gap-3"}>
      <input
        name="shop"
        required
        placeholder="your-store.myshopify.com"
        pattern="[a-zA-Z0-9\-]+\.myshopify\.com"
        title="Your store's .myshopify.com address"
        className={`rounded-lg border border-line-hi bg-white/5 px-3 py-2 text-sm text-hi placeholder:text-faint focus:border-gold/50 focus:outline-none ${compact ? "flex-1" : ""}`}
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-gradient-to-b from-gold-hi to-gold px-3.5 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
      >
        Connect store
      </button>
    </form>
  );
}
