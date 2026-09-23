import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon?: ReactNode;
}) {
  return (
    <div className="glass glass-hover rise-in flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-lo">{label}</p>
        {icon && <span className="text-gold-hi opacity-80">{icon}</span>}
      </div>
      <p className="font-mono text-[1.75rem] leading-none font-medium text-hi">{value}</p>
      {delta && (
        <p className={`text-xs font-medium ${delta.positive ? "text-teal" : "text-coral"}`}>
          {delta.positive ? "↑" : "↓"} {delta.value}
        </p>
      )}
    </div>
  );
}
