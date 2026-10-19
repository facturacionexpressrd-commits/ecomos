import { PageHeader } from "@/components/dashboard/ui/PageHeader";
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
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

// Phase 7: UI shell of the full agent/platform architecture. The agent status is a static
// placeholder — real status reads from AgentRun once that table exists.

type Status = "live" | "setup" | "soon";
type Agent = { name: string; integrations: string[]; status: Status };
type Module = {
  n: string;
  title: string;
  icon: LucideIcon;
  tone: string;
  agents: Agent[];
};

const STATUS_META: Record<Status, { label: string; className: string }> = {
  live: { label: "en vivo", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  setup: { label: "configurar", className: "bg-amber-50 text-amber-700 border-amber-200" },
  soon: { label: "pronto", className: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

const COMMAND: Module = {
  n: "03",
  title: "The Brain · Command Center",
  icon: Terminal,
  tone: "bg-neutral-900 text-lime-300",
  agents: [
    { name: "Command Agent", integrations: ["Claude", "pg-boss"], status: "live" },
    { name: "Task Manager Agent", integrations: ["Claude", "pg-boss"], status: "setup" },
    { name: "Approval Agent", integrations: ["Claude", "Slack"], status: "setup" },
    { name: "Alert Inbox", integrations: ["Slack", "Resend"], status: "setup" },
  ],
};

const INTELLIGENCE: Module = {
  n: "01",
  title: "Intelligence",
  icon: Telescope,
  tone: "bg-sky-100 text-sky-700",
  agents: [
    { name: "BA Agent", integrations: ["Claude", "Postgres"], status: "live" },
    { name: "Attribution Agent", integrations: ["Meta Ads", "Shopify"], status: "live" },
    { name: "Forecast Agent", integrations: ["Claude"], status: "setup" },
    { name: "Anomaly Agent", integrations: ["Claude", "Sentry"], status: "setup" },
    { name: "Demand Agent", integrations: ["Claude", "Google Trends"], status: "soon" },
    { name: "P3 Agent", integrations: ["Claude"], status: "soon" },
  ],
};

const MARKET_RESEARCH: Module = {
  n: "02",
  title: "Market Research",
  icon: SearchCheck,
  tone: "bg-sky-100 text-sky-700",
  agents: [
    { name: "Trend Agent", integrations: ["TikTok", "YouTube"], status: "setup" },
    { name: "Competitor Agent", integrations: ["Apify", "Meta Ad Library"], status: "setup" },
  ],
};

const PRODUCT_OFFER: Module = {
  n: "04",
  title: "Product & Offer",
  icon: Package,
  tone: "bg-sky-100 text-sky-700",
  agents: [
    { name: "P&L Agent", integrations: ["Shopify", "Postgres"], status: "live" },
    { name: "Pricing Agent", integrations: ["Claude", "Shopify"], status: "setup" },
    { name: "Positioning Agent", integrations: ["Claude"], status: "setup" },
    { name: "Offer Builder Agent", integrations: ["Claude", "Shopify"], status: "soon" },
  ],
};

const SUPPLY: Module = {
  n: "05",
  title: "Supply Chain",
  icon: Truck,
  tone: "bg-violet-100 text-violet-700",
  agents: [
    { name: "Supplier Finder", integrations: ["CJ", "AliExpress"], status: "live" },
    { name: "Supplier Scoring", integrations: ["Claude", "CJ"], status: "setup" },
    { name: "QC Agent", integrations: ["Claude"], status: "soon" },
    { name: "Negotiation Agent", integrations: ["Claude", "Email"], status: "soon" },
    { name: "Inventory Agent", integrations: ["Shopify", "CJ"], status: "live" },
  ],
};

const CREATIVE: Module = {
  n: "06",
  title: "Creative Studio",
  icon: Clapperboard,
  tone: "bg-amber-100 text-amber-700",
  agents: [
    { name: "Creative Strategist", integrations: ["Claude"], status: "setup" },
    { name: "Hook Agent", integrations: ["Claude"], status: "setup" },
    { name: "UGC Agent", integrations: ["ElevenLabs", "Runway"], status: "soon" },
    { name: "Ad Creative Agent", integrations: ["Fal.ai", "Canva"], status: "soon" },
  ],
};

const MARKETING: Module = {
  n: "07",
  title: "Marketing",
  icon: Megaphone,
  tone: "bg-amber-100 text-amber-700",
  agents: [
    { name: "Meta Ads Agent", integrations: ["Meta Marketing"], status: "live" },
    { name: "TikTok Ads Agent", integrations: ["TikTok Ads"], status: "soon" },
    { name: "Google Ads Agent", integrations: ["Google Ads"], status: "soon" },
    { name: "Social Agent", integrations: ["Buffer", "Instagram"], status: "setup" },
    { name: "Email Agent", integrations: ["Resend"], status: "setup" },
    { name: "SEO Agent", integrations: ["Claude"], status: "soon" },
  ],
};

const COMMERCE: Module = {
  n: "08",
  title: "Commerce / CRO",
  icon: ShoppingCart,
  tone: "bg-amber-100 text-amber-700",
  agents: [
    { name: "Store Agent", integrations: ["Shopify"], status: "live" },
    { name: "CRO Agent", integrations: ["Claude", "PostHog"], status: "soon" },
    { name: "UX Agent", integrations: ["Claude"], status: "soon" },
    { name: "A/B Testing Agent", integrations: ["Shopify", "PostHog"], status: "soon" },
  ],
};

const CUSTOMER: Module = {
  n: "09",
  title: "Customer",
  icon: Users,
  tone: "bg-pink-100 text-pink-700",
  agents: [
    { name: "Support Agent", integrations: ["Claude", "Gorgias"], status: "setup" },
    { name: "Review Agent", integrations: ["Shopify", "Judge.me"], status: "setup" },
    { name: "Retention Agent", integrations: ["Claude", "Resend"], status: "soon" },
  ],
};

const OPERATIONS: Module = {
  n: "10",
  title: "Operations",
  icon: Headphones,
  tone: "bg-violet-100 text-violet-700",
  agents: [
    { name: "Order Agent", integrations: ["Shopify", "Stripe"], status: "live" },
    { name: "Fulfillment Agent", integrations: ["CJ", "Shopify"], status: "live" },
    { name: "Tracking Agent", integrations: ["17track", "Shopify"], status: "setup" },
    { name: "Returns Agent", integrations: ["Shopify", "Claude"], status: "setup" },
  ],
};

const FINANCE: Module = {
  n: "11",
  title: "Finance",
  icon: Wallet,
  tone: "bg-emerald-100 text-emerald-700",
  agents: [
    { name: "Finance Agent", integrations: ["Stripe", "Shopify"], status: "live" },
    { name: "P&L Agent", integrations: ["Postgres"], status: "live" },
    { name: "Cash Flow Agent", integrations: ["Plaid", "Stripe"], status: "soon" },
    { name: "Kreipt Agent", integrations: ["Claude"], status: "soon" },
  ],
};

const RISK: Module = {
  n: "12",
  title: "Risk & Compliance",
  icon: ShieldCheck,
  tone: "bg-neutral-200 text-neutral-700",
  agents: [
    { name: "Fraud Agent", integrations: ["Stripe Radar"], status: "setup" },
    { name: "Chargeback Agent", integrations: ["Stripe"], status: "setup" },
    { name: "Compliance Agent", integrations: ["Claude"], status: "setup" },
    { name: "Spend Guard Agent", integrations: ["Meta Ads", "Postgres"], status: "live" },
  ],
};

const ROWS: { label: string; modules: Module[] }[] = [
  { label: "Comando", modules: [COMMAND] },
  { label: "Inteligencia", modules: [INTELLIGENCE, MARKET_RESEARCH, PRODUCT_OFFER, SUPPLY] },
  { label: "Marketing + Comercio", modules: [CREATIVE, MARKETING, COMMERCE, CUSTOMER] },
  { label: "Operaciones + Finanzas", modules: [OPERATIONS, FINANCE, RISK] },
];

const INTERRUPTS = [
  "Store caído",
  "Pagos rechazados",
  "Spike de devoluciones",
  "Chargeback entrante",
  "Agotado en el proveedor",
  "Ad desactivado por Meta",
  "ROAS cae > 30% en 2h",
  "Nuevo review 1 estrella",
  "Low cash alert",
  "Error en webhook",
];

function AgentCard({ a }: { a: Agent }) {
  const s = STATUS_META[a.status];
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-neutral-100 bg-neutral-50 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[12px] font-medium text-neutral-900">{a.name}</p>
        <span className={`shrink-0 rounded-full border px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${s.className}`}>
          {s.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {a.integrations.map((i) => (
          <span
            key={i}
            className="rounded-md bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 ring-1 ring-inset ring-neutral-200"
          >
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ m }: { m: Module }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <header className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${m.tone}`}>
          <m.icon size={13} strokeWidth={2} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-[10px] text-neutral-500">{m.n}</span>
          <span className="text-[13px] font-semibold text-neutral-900">{m.title}</span>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-1.5">
        {m.agents.map((a) => (
          <AgentCard key={a.name} a={a} />
        ))}
      </div>
    </section>
  );
}

export default function ArquitecturaPage() {
  const total = ROWS.flatMap((r) => r.modules).reduce((n, m) => n + m.agents.length, 0);
  const live = ROWS.flatMap((r) => r.modules).reduce(
    (n, m) => n + m.agents.filter((a) => a.status === "live").length,
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Orquestador"
        title="Arquitectura"
        subtitle="Mapa completo de agentes y las plataformas que necesitan. En vivo = ya está trabajando. Configurar = enciende con un API key. Pronto = en el roadmap."
        action={
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              {live} en vivo
            </span>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700">
              {total} agentes
            </span>
          </div>
        }
      />

      {ROWS.map((row) => (
        <section key={row.label}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {row.label}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {row.modules.map((m) => (
              <ModuleCard key={m.n} m={m} />
            ))}
          </div>
        </section>
      ))}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Datos y observabilidad
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: "Revenue & Profit", tag: "Postgres" },
              { label: "Ads & ROAS", tag: "Meta" },
              { label: "Store Conversion", tag: "Shopify" },
              { label: "Orders & Delivery", tag: "Shopify" },
              { label: "Agent Activity Log", tag: "pg-boss" },
            ].map((x) => (
              <div key={x.label} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-[11px] font-semibold text-neutral-900">{x.label}</p>
                <p className="mt-1 text-[10px] text-neutral-500">{x.tag}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Human handoff
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-900 bg-neutral-900 p-3 text-white">
              <p className="text-[11px] font-semibold">Tú · Aprobaciones</p>
              <p className="mt-1 text-[10px] text-neutral-400">cada gasto de dinero</p>
            </div>
            <div className="rounded-lg border border-neutral-900 bg-neutral-900 p-3 text-white">
              <p className="text-[11px] font-semibold">Tú · Scale or Kill</p>
              <p className="mt-1 text-[10px] text-neutral-400">decisiones de SKU</p>
            </div>
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-[11px] font-semibold text-neutral-900">Tus clientes</p>
              <p className="mt-1 text-[10px] text-neutral-500">reciben los resultados</p>
            </div>
          </div>
        </article>

        <aside className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Qué interrumpe el loop
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {INTERRUPTS.map((i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-700"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {i}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
