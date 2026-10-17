"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

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
  const t = useT();
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");

  const money = (v: string | null) => (v == null ? t("common.none") : `$${Number(v).toFixed(2)}`);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setErrorKey(null);
    setErrorText("");
    try {
      const res = await fetch("/api/suppliers/cj/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, variantId, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "");
      setRef("");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "cjLink.failed");
      setErrorText(message);
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <p className="text-xs text-faint">
        <Link href="/dashboard/integrations" className="underline hover:text-hi">
          {t("cjLink.connectLink")}
        </Link>{" "}
        {t("cjLink.connectSuffix")}
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-white/3 p-3">
      <p className="text-[11px] tracking-wide text-faint uppercase">{t("cjLink.heading")}</p>
      {link ? (
        <>
          <p className="truncate text-sm text-hi" title={link.supplierName ?? undefined}>
            {link.supplierSku ?? link.supplierName ?? t("cjLink.linked")}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-faint">{t("cjLink.unitCost")}</span>
            <span className="text-right font-mono text-hi">{money(link.cost)}</span>
            <span className="text-faint">{t("cjLink.shippingUs")}</span>
            <span className="text-right font-mono text-hi">{money(link.shippingCost)}</span>
            <span className="text-faint">{t("cjLink.delivery")}</span>
            <span className="text-right text-lo">
              {link.shippingDays ? t("cjLink.days", { count: link.shippingDays }) : t("common.none")}
              {link.shippingMethod ? ` · ${link.shippingMethod}` : ""}
            </span>
            <span className="text-faint">{t("cjLink.stock")}</span>
            <span className={`text-right font-mono ${link.availableQty === 0 ? "text-coral" : "text-hi"}`}>
              {link.availableQty ?? t("common.none")}
            </span>
          </div>
          {link.syncError && (
            <p className="text-xs text-coral">
              {t("cjLink.syncError", { message: link.syncError })}
            </p>
          )}
          <div className="flex gap-3 pt-1 text-xs">
            <button disabled={busy} onClick={() => send({ ref: link.supplierVariantId })} className="text-gold-hi hover:underline disabled:opacity-50">
              {busy ? t("cjLink.working") : t("cjLink.refresh")}
            </button>
            <button disabled={busy} onClick={() => send({ unlink: true })} className="text-lo hover:text-coral disabled:opacity-50">
              {t("cjLink.unlink")}
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
            placeholder={t("cjLink.refPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-line-hi bg-white/5 px-2 py-1.5 text-sm text-hi placeholder:text-faint focus:border-gold/50 focus:outline-none"
          />
          <button disabled={busy || !ref.trim()} className="rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-hi disabled:opacity-50">
            {busy ? "…" : t("cjLink.link")}
          </button>
        </form>
      )}
      {(errorKey || errorText) && (
        <p className="text-xs text-coral">{errorText || t(errorKey ?? "cjLink.failed")}</p>
      )}
      {!link && <p className="text-[11px] text-faint">{t("cjLink.hint")}</p>}
    </div>
  );
}
