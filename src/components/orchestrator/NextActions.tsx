export type NextAction = {
  id: string;
  rank: number;
  title: string;
  rationale: string;
  impactEstimate?: string;
};

export function NextActions({ actions }: { actions: NextAction[] }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <header className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Qué hacer ahora
        </p>
        <span className="text-[11px] text-neutral-400">
          Jev · {actions.length} propuestas
        </span>
      </header>

      <ul className="flex flex-col gap-2.5">
        {actions.length === 0 ? (
          <li className="rounded-lg border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400">
            Sin acciones pendientes. El orquestador avisará cuando algo necesite tu firma.
          </li>
        ) : (
          actions.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[10px] font-semibold text-white">
                  {a.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{a.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-600">{a.rationale}</p>
                  {a.impactEstimate && (
                    <p className="mt-1 font-mono text-[11px] text-emerald-700">
                      {a.impactEstimate}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-lime-300 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-lime-400"
              >
                Aprobar
              </button>
            </li>
          ))
        )}
      </ul>

      <p className="mt-3 border-t border-neutral-100 pt-3 text-[11px] text-neutral-400">
        Nada sale sin tu firma. Lo demás corre solo.
      </p>
    </section>
  );
}
