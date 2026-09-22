"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CjLink = {
  supplierVariantId: string;
  supplierSku: string | null;
  supplierName: string | null;
  cost: string | null;
  shippingCost: string | null;
  shippingMethod: string | null;
  shippingDays: string | null;
  availableQty: number | null;
  lastSyncedAt: string | null;
  syncError: string | null;
};

const money = (v: string | null) => (v == null ? "—" : `$${Number(v).toFixed(2)}`);

export default function CjLinkForm({
  storeId,
  variantId,
  link,
  connected,
}: {
  storeId: string;
  variantId: string;
  link: CjLink | null;
  connected: boolean;
}) {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers/cj/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, variantId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRef("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <p className="text-xs text-faint">
        <Link href="/dashboard/integrations" className="underline hover:text-hi">Connect CJ Dropshipping</Link> to pull this
        variant&apos;s real supplier cost.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-white/3 p-3">
      <p className="text-[11px] tracking-wide text-faint uppercase">CJ supplier</p>
      {link ? (
        <>
          <p className="truncate text-sm text-hi" title={link.supplierName ?? undefined}>
            {link.supplierSku ?? link.supplierName ?? "Linked"}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-faint">Unit cost</span>
            <span className="text-right font-mono text-hi">{money(link.cost)}</span>
            <span className="text-faint">Shipping (US)</span>
            <span className="text-right font-mono text-hi">{money(link.shippingCost)}</span>
            <span className="text-faint">Delivery</span>
            <span className="text-right text-lo">
              {link.shippingDays ? `${link.shippingDays} days` : "—"}
              {link.shippingMethod ? ` · ${link.shippingMethod}` : ""}
            </span>
            <span className="text-faint">CJ stock</span>
            <span className={`text-right font-mono ${link.availableQty === 0 ? "text-coral" : "text-hi"}`}>
              {link.availableQty ?? "—"}
            </span>
          </div>
          {link.syncError && <p className="text-xs text-coral">Last refresh failed: {link.syncError}</p>}
          <div className="flex gap-3 pt-1 text-xs">
            <button disabled={busy} onClick={() => send({ ref: link.supplierVariantId })} className="text-gold-hi hover:underline disabled:opacity-50">
              {busy ? "Working…" : "Refresh"}
            </button>
            <button disabled={busy} onClick={() => send({ unlink: true })} className="text-lo hover:text-coral disabled:opacity-50">
              Unlink
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send({ ref });
          }}
          className="flex gap-2"
        >
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="CJ variant SKU or ID"
            className="min-w-0 flex-1 rounded-lg border border-line-hi bg-white/5 px-2 py-1.5 text-sm text-hi placeholder:text-faint focus:border-gold/50 focus:outline-none"
          />
          <button disabled={busy || !ref.trim()} className="rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-hi disabled:opacity-50">
            {busy ? "…" : "Link"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-coral">{error}</p>}
      {!link && <p className="text-[11px] text-faint">Linking sets this variant&apos;s cost to CJ&apos;s price + shipping.</p>}
    </div>
  );
}
