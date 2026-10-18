import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { Check, X } from "lucide-react";

type Quote = { source: string; text: string; intent: string };
type Hook = { text: string; score: number; angle: string };
type Angle = { title: string; summary: string; score: number };
type Script = { title: string; body: string; status: "ready" | "test" };
type Draft = { title: string; thumb?: string };

// Phase 4 wiring: these come from the review-ingest + Claude variant generator once CustomerVoiceQuote
// + CreativeDraft tables ship. For now the module is navigable with representative content so UI
// review is possible before the data layer lands.

const QUOTES: Quote[] = [
  { source: "Reseña · 5★", text: "Pensé que era otra estafa de TikTok. Me equivoqué.", intent: "escepticismo roto" },
  { source: "Reseña · 4★", text: "Mi gato ya no se esconde cuando lo saco.", intent: "beneficio inesperado" },
  { source: "Comentario IG", text: "¿Hace cuánto que existe esto? ¿Dónde estabas toda mi vida?", intent: "entusiasmo" },
  { source: "DM", text: "¿Funciona también con pelo de perro grande?", intent: "pregunta de uso" },
  { source: "Reseña · 2★", text: "Llegó roto, pero el soporte me reembolsó rápido.", intent: "fricción resuelta" },
];

const HOOKS: Hook[] = [
  { text: "“No gastes $200 en un pulidor profesional — este hace lo mismo.”", score: 92, angle: "ahorro vs premium" },
  { text: "“Pensé que era otra estafa — hasta que lo probé.”", score: 88, angle: "escepticismo roto" },
  { text: "“Mi sofá después de 60 segundos.”", score: 85, angle: "antes/después" },
  { text: "“Lo que mi casa escondía debajo de los cojines.”", score: 81, angle: "revelación" },
];

const ANGLES: Angle[] = [
  { title: "Ángulo del escepticismo", summary: "Validación social desde el PdV del dueño que no creía.", score: 94 },
  { title: "Ángulo satisfactorio-vacío", summary: "Loop estético ‘antes/después’, sin voz. Alto retention.", score: 91 },
  { title: "Ángulo del ahorro", summary: "Compara contra servicio profesional de $200.", score: 78 },
  { title: "Ángulo del regalo", summary: "Para padres/dueños de mascotas — gift idea.", score: 70 },
];

const SCRIPTS: Script[] = [
  {
    title: "Script UGC · 15s · escepticismo",
    status: "ready",
    body:
      "0–3s · ‘Pensé que era otra estafa de TikTok…’\n" +
      "3–8s · Demo de pelo saliendo del sofá, cámara cerrada.\n" +
      "8–12s · ‘Mira esto’ — mano levanta rodillo, montaña de pelo.\n" +
      "12–15s · Overlay: “Pet Hair Remover · envío 24h”.",
  },
  {
    title: "Script UGC · 20s · ahorro",
    status: "test",
    body:
      "Hook: ‘Quería contratar un pulidor profesional…’\n" +
      "Problema: cotización $200/visita.\n" +
      "Solución: usa el rodillo, mismo resultado.\n" +
      "CTA: ‘Link en bio, oferta por 24h.’",
  },
];

const DRAFTS: Draft[] = Array.from({ length: 8 }, (_, i) => ({ title: `Variación ${i + 1}` }));

export default function VozDelClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Estudio Creativo"
        title="Voz del cliente"
        subtitle="Hooks, ángulos y scripts sacados del lenguaje real de tus reseñas y comentarios."
        action={
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-medium text-white">
            Pet Hair Remover Roller · 260 órdenes
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Voz del cliente
          </p>
          <ul className="flex flex-col gap-3">
            {QUOTES.map((q, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p className="text-xs text-neutral-500">{q.source}</p>
                <p className="text-sm text-neutral-900">{q.text}</p>
                <span className="inline-flex w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700">
                  {q.intent}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Hooks
          </p>
          <ul className="flex flex-col gap-3">
            {HOOKS.map((h, i) => (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-neutral-900">{h.text}</p>
                  <span className="shrink-0 font-mono text-xs font-semibold text-emerald-700">
                    {h.score}
                  </span>
                </div>
                <span className="inline-flex w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-700">
                  {h.angle}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Ángulos
          </p>
          <ul className="flex flex-col gap-3">
            {ANGLES.map((a, i) => (
              <li key={i} className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900">{a.title}</p>
                  <span className="shrink-0 font-mono text-xs font-semibold text-emerald-700">
                    {a.score}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">{a.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Scripts UGC
            </p>
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">
              Claude
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {SCRIPTS.map((s, i) => (
              <li key={i} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-neutral-900">{s.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.status === "ready"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {s.status === "ready" ? "listo" : "probar"}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-snug text-neutral-700">
                  {s.body}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Generaciones · cada hook, cada ángulo
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-neutral-900">
              Cola de aprobación
            </h2>
          </div>
          <span className="text-[11px] text-neutral-400">
            Nada se publica sin tu firma.
          </span>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {DRAFTS.map((d, i) => (
            <article
              key={i}
              className="flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50"
            >
              <div className="aspect-[9/14] bg-neutral-200" />
              <div className="flex items-center justify-between gap-1 p-2">
                <p className="truncate text-[11px] text-neutral-700">{d.title}</p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label="Rechazar"
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                  >
                    <X size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Aprobar"
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-300 text-neutral-950 hover:bg-lime-400"
                  >
                    <Check size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
