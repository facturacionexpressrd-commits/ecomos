import {
  Terminal,
  Telescope,
  SearchCheck,
  Package,
  Truck,
  Clapperboard,
  Megaphone,
  ShoppingCart,
  Users,
  Headphones,
  Wallet,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type Module = {
  n: string;
  label: string;
  icon: LucideIcon;
  tone: string; // Tailwind class fragment for chip bg
};

/** The 12-module map Re-Structure teases. The 4 bold ones ship today. */
const MODULES: Module[] = [
  { n: "01", label: "Command", icon: Terminal, tone: "bg-neutral-900 text-lime-300" },
  { n: "02", label: "Inteligencia", icon: Telescope, tone: "bg-sky-100 text-sky-700" },
  { n: "03", label: "Investigación", icon: SearchCheck, tone: "bg-sky-100 text-sky-700" },
  { n: "04", label: "Producto y Oferta", icon: Package, tone: "bg-sky-100 text-sky-700" },
  { n: "05", label: "Suministro", icon: Truck, tone: "bg-violet-100 text-violet-700" },
  { n: "06", label: "Estudio Creativo", icon: Clapperboard, tone: "bg-amber-100 text-amber-700" },
  { n: "07", label: "Marketing", icon: Megaphone, tone: "bg-amber-100 text-amber-700" },
  { n: "08", label: "Comercio / CRO", icon: ShoppingCart, tone: "bg-amber-100 text-amber-700" },
  { n: "09", label: "Clientes", icon: Users, tone: "bg-pink-100 text-pink-700" },
  { n: "10", label: "Operaciones", icon: Headphones, tone: "bg-violet-100 text-violet-700" },
  { n: "11", label: "Finanzas", icon: Wallet, tone: "bg-emerald-100 text-emerald-700" },
  { n: "12", label: "Riesgo y Cumplimiento", icon: ShieldCheck, tone: "bg-neutral-200 text-neutral-700" },
];

export function ModuleHub() {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Orquestador — conecta los 12 módulos
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            AI Orchestrator
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            El COO que nunca duerme. 12 módulos cableados en un solo sistema que comparten datos
            y se pasan trabajo. Un humano en cada decisión que gasta dinero.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-neutral-950">
          12 agentes
        </span>
      </div>

      <div className="relative mx-auto grid max-w-3xl grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {MODULES.map((m) => (
          <div
            key={m.n}
            className="flex flex-col items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center transition-colors hover:border-neutral-200 hover:bg-white"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.tone}`}>
              <m.icon size={16} strokeWidth={2} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[10px] text-neutral-500">{m.n}</span>
              <span className="text-[11px] font-medium text-neutral-800">{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
