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
        className={`rounded border px-3 py-2 text-sm ${compact ? "flex-1" : ""}`}
      />
      <button type="submit" className="rounded bg-black px-3 py-2 text-sm text-white hover:bg-gray-800">
        Connect store
      </button>
    </form>
  );
}
