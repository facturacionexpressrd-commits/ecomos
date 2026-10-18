export type PnLLine = { label: string; value: number; tone: "cost" | "net" };
export type BestSeller = { title: string; orders: number; revenue: number };

const money = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export function DailyPnL({
  storeName,
  date,
  revenue,
  costs,
  netProfit,
  bestSellers,
  currency = "USD",
}: {
  storeName: string;
  date: Date;
  revenue: number;
  costs: PnLLine[];
  netProfit: number;
  bestSellers: BestSeller[];
  currency?: string;
}) {
  const fmtDate = new Intl.DateTimeFormat("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Diario P&L
          </p>
          <p className="mt-0.5 text-base font-semibold text-neutral-900">{storeName}</p>
          <p className="text-xs capitalize text-neutral-500">{fmtDate}</p>
        </div>
      </header>

      <section>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Más vendido
        </p>
        <ul className="divide-y divide-neutral-100">
          {bestSellers.length === 0 ? (
            <li className="py-3 text-xs text-neutral-400">Sin ventas aún hoy.</li>
          ) : (
            bestSellers.map((s) => (
              <li key={s.title} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="truncate text-neutral-800">{s.title}</span>
                <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-neutral-500">
                  <span>{s.orders} órdenes</span>
                  <span className="text-neutral-900">{money(s.revenue, currency)}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="border-t border-neutral-100 pt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Ingresos totales
          </span>
          <span className="font-mono font-semibold text-neutral-900">
            {money(revenue, currency)}
          </span>
        </div>
      </section>

      <section className="border-t border-neutral-100 pt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Qué costó
        </p>
        <ul className="flex flex-col gap-1.5">
          {costs.map((c) => (
            <li key={c.label} className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">{c.label}</span>
              <span className="font-mono text-neutral-900">-{money(c.value, currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-1 flex items-center justify-between rounded-xl bg-lime-300 px-4 py-3 text-neutral-950">
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">Net profit</span>
        <span className="font-mono text-xl font-semibold">{money(netProfit, currency)}</span>
      </section>
    </aside>
  );
}
