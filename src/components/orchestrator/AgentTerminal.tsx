export type AgentRunLine = {
  agent: string;
  tone: "lime" | "amber" | "sky" | "pink" | "red";
  action: string;
  detail?: string;
  cost?: string;
};

const TONE: Record<AgentRunLine["tone"], string> = {
  lime: "text-lime-300",
  amber: "text-amber-300",
  sky: "text-sky-300",
  pink: "text-pink-300",
  red: "text-red-300",
};

export function AgentTerminal({ lines }: { lines: AgentRunLine[] }) {
  return (
    <section className="rounded-2xl bg-neutral-950 p-4 font-mono text-[11px] text-neutral-300 shadow-inner">
      <header className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Agentes · últimas ejecuciones
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-400">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> live
        </span>
      </header>
      <ul className="flex flex-col gap-1">
        {lines.map((l, i) => (
          <li key={i} className="flex items-baseline gap-3">
            <span className={`w-32 shrink-0 truncate ${TONE[l.tone]}`}>{l.agent}</span>
            <span className="flex-1 text-neutral-200">
              {l.action}
              {l.detail && <span className="text-neutral-500"> — {l.detail}</span>}
            </span>
            {l.cost && <span className="shrink-0 text-neutral-500">{l.cost}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
