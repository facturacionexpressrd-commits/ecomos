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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 max-w-xl text-sm text-neutral-600">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center">
      <p className="text-xl font-medium tracking-tight text-neutral-900">{title}</p>
      <p className="max-w-sm text-sm text-neutral-600">{children}</p>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === "connected" || s === "active" || s === "delivered" || s === "paid" || s === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "error" || s === "failed" || s === "cancelled" || s === "critical"
        ? "bg-red-50 text-red-700 border-red-200"
        : s === "pending" || s === "processing" || s === "paused"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-neutral-100 text-neutral-700 border-neutral-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
