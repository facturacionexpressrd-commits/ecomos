// Thin status strip at the top of each module page — mirrors the live-events ticker across the
// re-structure.ai module screenshots. Static items for now; wires to AgentRun events once that
// table lands.

type Dot = { tone: "lime" | "amber" | "sky" | "pink" | "red"; label: string };

const DOT_TONE: Record<Dot["tone"], string> = {
  lime: "bg-lime-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  pink: "bg-pink-400",
  red: "bg-red-400",
};

export function LiveTicker({ items }: { items?: Dot[] }) {
  const defaults: Dot[] = items ?? [
    { tone: "lime", label: "12 agentes · activos" },
    { tone: "sky", label: "Shopify · sync al día" },
    { tone: "amber", label: "Meta · 4 campañas en vivo" },
    { tone: "lime", label: "Spend Guard · dentro de límite" },
    { tone: "pink", label: "P&L · cerrado 7:00" },
    { tone: "sky", label: "Attribution · 14 de 14" },
  ];
  return (
    <div className="flex items-center gap-5 overflow-x-auto rounded-xl bg-neutral-950 px-4 py-2 text-[11px] text-neutral-300">
      {defaults.map((d) => (
        <span key={d.label} className="flex shrink-0 items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[d.tone]}`} />
          {d.label}
        </span>
      ))}
    </div>
  );
}
