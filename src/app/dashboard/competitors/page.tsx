import { PageHeader } from "@/components/dashboard/ui/PageHeader";
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
