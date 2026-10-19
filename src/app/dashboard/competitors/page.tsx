import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { LiveTicker } from "@/components/orchestrator/LiveTicker";
import { Play, ArrowUpRight } from "lucide-react";

type Competitor = {
  rank: number;
  product: string;
  roasMult: string;
  firstSeen: string;
  thumb?: string;
};

type Hook = {
  id: string;
  caption: string;
  intents: string[];
  views: string;
};

type PortfolioRow = {
  rank: number;
  product: string;
  revenue7d: number;
  change: number; // % change vs previous 7d
  roas: number;
  orders: number;
  verdict: "winner" | "hold" | "cut";
  spark: number[]; // 7 points
};

// Phase 3 wiring: these come from the CompetitorAd ingest once that worker lands. The schema is
// drafted (see .planning); until then this page ships with representative data so the module is
// navigable and reviewable end to end.
const RISING: Competitor[] = [
  { rank: 1, product: "Galaxy Star Projector", roasMult: "2.57×", firstSeen: "hace 3 d" },
  { rank: 2, product: "Pet Hair Remover Roller", roasMult: "2.06×", firstSeen: "hace 5 d" },
  { rank: 3, product: "Mini Massage Gun", roasMult: "1.90×", firstSeen: "hace 6 d" },
  { rank: 4, product: "Portable Blender Bottle", roasMult: "1.74×", firstSeen: "hace 8 d" },
  { rank: 5, product: "Sunset Projection Lamp", roasMult: "1.52×", firstSeen: "hace 11 d" },
];

const PORTFOLIO: PortfolioRow[] = [
  { rank: 1, product: "Pet Hair Remover Roller", revenue7d: 8577, change: 42, roas: 2.7, orders: 260, verdict: "winner", spark: [120, 180, 240, 300, 420, 520, 640] },
  { rank: 2, product: "Mini Massage Gun", revenue7d: 6220, change: 18, roas: 2.1, orders: 198, verdict: "winner", spark: [220, 260, 240, 310, 330, 420, 460] },
  { rank: 3, product: "Galaxy Star Projector", revenue7d: 4890, change: -6, roas: 1.5, orders: 142, verdict: "hold", spark: [410, 420, 380, 360, 340, 320, 310] },
  { rank: 4, product: "Portable Blender Bottle", revenue7d: 3410, change: 11, roas: 1.9, orders: 118, verdict: "hold", spark: [180, 210, 230, 220, 260, 290, 310] },
  { rank: 5, product: "Sunset Projection Lamp", revenue7d: 2110, change: -22, roas: 1.1, orders: 74, verdict: "cut", spark: [320, 310, 280, 240, 210, 180, 150] },
];

const VERDICT_META: Record<PortfolioRow["verdict"], { label: string; className: string }> = {
  winner: { label: "escalar", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  hold: { label: "mantener", className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  cut: { label: "cortar", className: "bg-red-50 text-red-700 border-red-200" },
};

function TinySpark({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points, min + 1);
  const w = 80;
  const h = 24;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const trend = points[points.length - 1] >= points[0] ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-20">
      <path d={path} fill="none" stroke={trend} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HOOKS: Hook[] = [
  { id: "h1", caption: "“My couch has never looked this clean…”", intents: ["prueba social", "antes/después"], views: "1.4M" },
  { id: "h2", caption: "“POV: you order it at 2am and it changes your life”", intents: ["humor", "POV"], views: "890K" },
  { id: "h3", caption: "“The reason my dog is terrified of me now”", intents: ["gancho desconcertante"], views: "620K" },
  { id: "h4", caption: "“3 cosas que nadie te dice de este producto”", intents: ["listicle", "autoridad"], views: "540K" },
  { id: "h5", caption: "“Esperaba que fuera estafa — no lo era”", intents: ["escepticismo"], views: "410K" },
  { id: "h6", caption: "“Mi novio pensó que era un juguete”", intents: ["gancho social"], views: "380K" },
  { id: "h7", caption: "“Lo probé por 30 días. Esto pasó.”", intents: ["30-day challenge"], views: "320K" },
];

export default function CompetitorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <LiveTicker />

      <PageHeader
        eyebrow="Inteligencia"
        title="Competidores"
        subtitle="Qué está escalando ahora mismo en tu categoría — y por qué."
        action={
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-medium text-white">
            7 día · últimas 24 h
          </span>
        }
      />

      <section className="rounded-2xl border border-neutral-200 bg-white">
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Tu tienda · últimos 7 días
            </p>
            <p className="mt-0.5 text-sm font-semibold text-neutral-900">Portfolio</p>
          </div>
          <span className="text-[11px] text-neutral-400">Jev · veredicto por SKU</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                <th className="px-5 py-2 text-left font-semibold">#</th>
                <th className="px-5 py-2 text-left font-semibold">Producto</th>
                <th className="px-5 py-2 text-right font-semibold">Ingresos 7d</th>
                <th className="px-5 py-2 text-right font-semibold">Cambio</th>
                <th className="px-5 py-2 text-right font-semibold">ROAS</th>
                <th className="px-5 py-2 text-right font-semibold">Órdenes</th>
                <th className="px-5 py-2 text-center font-semibold">Tendencia</th>
                <th className="px-5 py-2 text-center font-semibold">Veredicto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {PORTFOLIO.map((r) => {
                const v = VERDICT_META[r.verdict];
                return (
                  <tr key={r.rank} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 font-mono text-xs text-neutral-500">{r.rank}</td>
                    <td className="px-5 py-2.5 font-medium text-neutral-900">{r.product}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-neutral-900">
                      ${r.revenue7d.toLocaleString()}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-mono ${r.change >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {r.change > 0 ? "+" : ""}
                      {r.change}%
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-neutral-900">
                      {r.roas.toFixed(1)}×
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-neutral-900">
                      {r.orders}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <div className="inline-block"><TinySpark points={r.spark} /></div>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${v.className}`}>
                        {v.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white">
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Nuevos productos subiendo
          </p>
          <span className="text-[11px] text-neutral-400">
            Jev · ranqueado por señal
          </span>
        </header>
        <ul className="divide-y divide-neutral-100">
          {RISING.map((c) => (
            <li key={c.rank} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 font-mono text-[11px] font-semibold text-neutral-700">
                  {c.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{c.product}</p>
                  <p className="text-[11px] text-neutral-500">visto por primera vez {c.firstSeen}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700">
                  {c.roasMult}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Explorar <ArrowUpRight size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Supera los hooks de la competencia
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-neutral-900">
              7 ganchos virales esta semana
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full bg-lime-300 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-lime-400"
          >
            Enviar al Estudio Creativo
          </button>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {HOOKS.map((h) => (
            <article
              key={h.id}
              className="group flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3 transition-colors hover:border-neutral-200 hover:bg-white"
            >
              <div className="relative flex aspect-[9/14] items-center justify-center rounded-lg bg-neutral-200">
                <Play size={18} className="text-neutral-500" />
                <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
                  {h.views}
                </span>
              </div>
              <p className="line-clamp-3 text-[11px] leading-snug text-neutral-800">{h.caption}</p>
              <div className="flex flex-wrap gap-1">
                {h.intents.map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
