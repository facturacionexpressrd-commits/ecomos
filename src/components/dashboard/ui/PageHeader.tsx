import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    // Compact on purpose: the page's data should start near the top of the screen, not under a banner.
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium italic text-hi">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-lo">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass rise-in flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl italic text-hi">{title}</p>
      <p className="max-w-sm text-sm text-lo">{children}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === "connected" || s === "active" || s === "delivered" || s === "paid" || s === "completed"
      ? "bg-teal/15 text-teal border-teal/30"
      : s === "error" || s === "failed" || s === "cancelled" || s === "critical"
        ? "bg-coral/15 text-coral border-coral/30"
        : s === "pending" || s === "processing" || s === "paused"
          ? "bg-gold/15 text-gold-hi border-gold/30"
          : "bg-white/5 text-lo border-line-hi";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
