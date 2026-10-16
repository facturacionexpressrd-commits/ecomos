"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

export default function SendToCjButton({ storeId, orderId, linkedItems }: { storeId: string; orderId: string; linkedItems: number }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    // Creates a real order at CJ (unpaid), so make the click deliberate.
    if (!confirm(`Create this order at CJ with ${linkedItems} linked item${linkedItems === 1 ? "" : "s"}? You'll pay for it in your CJ account.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers/cj/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("cj.failed"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cj.failed"));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={send}
        disabled={busy}
        className="rounded-lg bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-hi disabled:opacity-50"
      >
        {busy ? t("cj.sending") : t("cj.send")}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-coral">{error}</p>}
    </div>
  );
}
