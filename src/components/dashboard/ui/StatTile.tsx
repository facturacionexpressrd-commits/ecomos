import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  delta,
  icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
  /** When true, renders as the hero yellow tile — one per page max. */
  accent?: boolean;
}) {
  if (accent) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-lime-300 p-5 text-neutral-950">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
          {icon && <span className="opacity-80">{icon}</span>}
        </div>
        <p className="font-mono text-[1.9rem] leading-none font-semibold">{value}</p>
        {delta && (
          <p className="text-xs font-medium">
            {delta.positive ? "↑" : "↓"} {delta.value}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</p>
        {icon && <span className="text-neutral-400">{icon}</span>}
      </div>
      <p className="font-mono text-[1.75rem] leading-none font-semibold text-neutral-900">{value}</p>
      {delta && (
        <p className={`text-xs font-medium ${delta.positive ? "text-emerald-600" : "text-red-600"}`}>
          {delta.positive ? "↑" : "↓"} {delta.value}
        </p>
      )}
    </div>
  );
}
