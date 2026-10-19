import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { LiveTicker } from "@/components/orchestrator/LiveTicker";
import {
  CreditCard,
  Truck,
  Package,
  Mail,
  ShieldAlert,
  CircleDot,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Phase 5 wiring: this view will read from Order events + FulfillmentException. Static sample for
// now so the Operations module is reviewable before the event-stream wiring lands.

type TimelineEvent = {
  time: string;
  title: string;
  detail: string;
  tag: "payment" | "supplier" | "tracking" | "email" | "customs";
  status: "done" | "running" | "flagged";
};

type SupportCase = {
  tone: "pink" | "amber" | "red" | "neutral";
  type: string;
  snippet: string;
  handledBy: "agent" | "human";
};

const TAG_META: Record<TimelineEvent["tag"], { label: string; className: string; icon: LucideIcon }> = {
  payment: { label: "Pago", className: "bg-sky-100 text-sky-700", icon: CreditCard },
  supplier: { label: "Proveedor", className: "bg-violet-100 text-violet-700", icon: Truck },
  tracking: { label: "Rastreo", className: "bg-amber-100 text-amber-700", icon: Package },
  email: { label: "Email", className: "bg-emerald-100 text-emerald-700", icon: Mail },
  customs: { label: "Aduana", className: "bg-pink-100 text-pink-700", icon: ShieldAlert },
};

const EVENTS: TimelineEvent[] = [
  { time: "07:02", title: "Nueva orden #10452", detail: "Zara G. · $47 · pago verificado", tag: "payment", status: "done" },
  { time: "07:04", title: "Enviada al proveedor", detail: "CJ · ETA tracking en 36 h", tag: "supplier", status: "done" },
  { time: "07:36", title: "Tracking obtenido", detail: "USPS 940 010 4832 1024", tag: "tracking", status: "done" },
  { time: "07:37", title: "Email de confirmación enviado", detail: "al cliente, con número de guía", tag: "email", status: "done" },
  { time: "09:21", title: "Orden #10459 — pago fallido", detail: "Reintento programado · notificado al cliente", tag: "payment", status: "flagged" },
  { time: "10:05", title: "Lote de 7 pedidos → CJ", detail: "Esperando confirmación de empaque", tag: "supplier", status: "running" },
];

type DayKPI = { label: string; value: string; sub: string };
const KPIS: DayKPI[] = [
  { label: "Pagos verificados", value: "220", sub: "100% match" },
  { label: "Órdenes enviadas", value: "198", sub: "22 en cola" },
  { label: "Devoluciones cerradas", value: "22", sub: "0.9% del total" },
  { label: "Tracking sincronizado", value: "198", sub: "USPS · CJ" },
];

type OrderRow = {
  customer: string;
  product: string;
  cost: string;
  status: "paid" | "shipped" | "flagged";
};
const ORDERS: OrderRow[] = [
  { customer: "Jude Soul", product: "Pet Hair Remover Roller", cost: "$18.40", status: "shipped" },
  { customer: "Chloe Rayne", product: "Mini Massage Gun", cost: "$29.50", status: "shipped" },
  { customer: "Omari Jones", product: "Galaxy Star Projector", cost: "$12.10", status: "flagged" },
  { customer: "Marcus Hunt", product: "Portable Blender Bottle", cost: "$9.80", status: "paid" },
];

const ORDER_STATUS: Record<OrderRow["status"], { label: string; className: string }> = {
  paid: { label: "pagado", className: "bg-sky-50 text-sky-700" },
  shipped: { label: "enviado", className: "bg-emerald-50 text-emerald-700" },
  flagged: { label: "revisar", className: "bg-amber-50 text-amber-700" },
};

const SUPPORT: SupportCase[] = [
  { tone: "amber", type: "Perdido en tránsito", snippet: "“Mi paquete lleva 11 días sin moverse.”", handledBy: "agent" },
  { tone: "red", type: "Llegó dañado", snippet: "“La caja llegó aplastada y el producto roto.”", handledBy: "human" },
  { tone: "pink", type: "Pide reembolso", snippet: "“Ya no lo quiero, acabo de pedirlo ayer.”", handledBy: "agent" },
  { tone: "neutral", type: "Rastreo falso", snippet: "“La guía dice entregado pero no recibí nada.”", handledBy: "human" },
  { tone: "amber", type: "Pregunta de talla", snippet: "“¿Qué talla me recomiendas si soy mediano?”", handledBy: "agent" },
];

const TONE: Record<SupportCase["tone"], string> = {
  pink: "border-l-pink-400",
  amber: "border-l-amber-400",
  red: "border-l-red-400",
  neutral: "border-l-neutral-300",
};

export default function OperationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <LiveTicker />

      <PageHeader
        eyebrow="Operaciones"
        title="Hoy"
        subtitle="Órdenes, proveedor, rastreo y soporte — en vivo, hasta el cierre del día."
        action={
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-medium text-white">
            220 en cola
          </span>
        }
      />

      <section className="rounded-2xl bg-lime-300 p-6 text-neutral-950">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-5xl font-semibold leading-none">7:00 AM</p>
            <p className="mt-2 text-sm font-medium">Buenos días. Todo listo.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="font-mono text-4xl font-semibold leading-none">220</p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              órdenes para procesar hoy
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Línea de tiempo · hoy
            </p>
            <span className="text-[11px] text-neutral-400">6 eventos · 2 requieren tu ojo</span>
          </header>
          <ul className="divide-y divide-neutral-100">
            {EVENTS.map((e, i) => {
              const meta = TAG_META[e.tag];
              const Icon = meta.icon;
              return (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 w-14 shrink-0 font-mono text-[11px] text-neutral-500">
                    {e.time}
                  </span>
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.className}`}
                  >
                    <Icon size={12} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{e.title}</p>
                    <p className="text-xs text-neutral-500">{e.detail}</p>
                  </div>
                  {e.status === "flagged" ? (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      requiere revisión
                    </span>
                  ) : e.status === "running" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      <Clock size={9} /> en curso
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CircleDot size={9} /> hecho
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="rounded-2xl border border-neutral-200 bg-white p-5">
          <header className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Cuando algo sale mal
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Los casos de rutina se cierran solos. Lo que necesita tu criterio llega pre-diagnosticado.
            </p>
          </header>
          <ul className="flex flex-col gap-2">
            {SUPPORT.map((c, i) => (
              <li
                key={i}
                className={`flex flex-col gap-1 rounded-lg border border-neutral-100 bg-neutral-50 border-l-4 p-3 ${TONE[c.tone]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-900">{c.type}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      c.handledBy === "agent"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-900 text-white"
                    }`}
                  >
                    {c.handledBy === "agent" ? "resuelto por agente" : "necesita humano"}
                  </span>
                </div>
                <p className="text-xs text-neutral-700">{c.snippet}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {k.label}
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-neutral-900">{k.value}</p>
            <p className="mt-1 text-[11px] text-neutral-500">{k.sub}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white">
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Órdenes recientes
          </p>
          <span className="text-[11px] text-neutral-400">última hora</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                <th className="px-5 py-2 text-left">Cliente</th>
                <th className="px-5 py-2 text-left">Producto</th>
                <th className="px-5 py-2 text-right">Costo</th>
                <th className="px-5 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ORDERS.map((o) => {
                const s = ORDER_STATUS[o.status];
                return (
                  <tr key={o.customer} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 font-medium text-neutral-900">{o.customer}</td>
                    <td className="px-5 py-2.5 text-neutral-700">{o.product}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-neutral-900">{o.cost}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.className}`}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
