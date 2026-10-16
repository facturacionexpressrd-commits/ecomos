"use client";

import { useT } from "@/lib/i18n/client";

// Catches a failed page inside the dashboard shell, so the menu stays usable and the user can retry.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="glass mx-auto mt-16 flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl italic text-hi">{t("dashboard.error.title")}</p>
      <p className="text-sm text-lo">
        {t("dashboard.error.body")} <span className="font-mono text-hi">{error.digest ?? "n/a"}</span>
      </p>
      <button onClick={reset} className="rounded bg-gold px-4 py-2 text-sm text-ink">
        {t("common.tryAgain")}
      </button>
    </div>
  );
}
