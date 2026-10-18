import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "EcomOS: ganancia real para tiendas Shopify",
  description:
    "Órdenes, devoluciones, costos de productos y gasto de Meta Ads en un solo panel, para que veas la ganancia real por producto y por variante.",
};

const CAPABILITIES = [
  {
    n: "01",
    title: "Orquestador",
    body: "El COO que nunca duerme. Enruta trabajo entre módulos, cierra el P&L del día en una sola página, y te deja decidir solo lo que mueve dinero.",
  },
  {
    n: "02",
    title: "Inteligencia",
    body: "Margen real por SKU, veredictos tipo ganador / mantener / cortar, y los productos que están subiendo en la competencia esta semana.",
  },
  {
    n: "03",
    title: "Estudio Creativo",
    body: "Hooks, ángulos y scripts UGC sacados del lenguaje real de tus reseñas. Variaciones en cola, nada se publica sin tu firma.",
  },
  {
    n: "04",
    title: "Operaciones",
    body: "Orden a entrega en vivo, soporte con escalación. Los casos de rutina se cierran solos; lo que necesita tu criterio llega pre-diagnosticado.",
  },
];

const METHOD: { k: string; v: string }[] = [
  { k: "Conectar", v: "Shopify y Meta, dos clics de OAuth." },
  {
    k: "Medir",
    v: "Ganancia real, devoluciones y gasto de pauta conciliados cada noche.",
  },
  {
    k: "Crecer",
    v: "Re-presupuesta por ganancia, no por ingresos de último clic.",
  },
];

const METRICS = [
  { v: "100%", k: "De órdenes conciliadas con el gasto en pauta" },
  { v: "<2 min", k: "Del registro a tu primera tienda conectada" },
  { v: "24/7", k: "Sincronización y alertas nocturnas" },
  { v: "0", k: "Hojas de cálculo que tengas que tocar" },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-black [color-scheme:light]">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        <header className="flex items-center justify-between pt-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
              E
            </span>
            <span className="text-base font-medium tracking-tight">EcomOS</span>
          </Link>
          <nav className="flex items-center gap-7 text-sm">
            <Link href="/pricing" className="text-neutral-700 hover:text-black">
              Precios
            </Link>
            <Link href="/login" className="text-neutral-700 hover:text-black">
              Iniciar sesión
            </Link>
            <Link
              href="/login?mode=sign-up"
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Comenzar <ArrowRight size={14} />
            </Link>
          </nav>
        </header>

        <section className="pt-28 pb-24 sm:pt-40 sm:pb-32">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            12 módulos · un solo sistema
          </p>
          <h1 className="max-w-5xl text-5xl font-medium leading-[1.02] tracking-[-0.03em] sm:text-7xl lg:text-8xl">
            El sistema operativo con IA para tu tienda Shopify.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-700 sm:text-xl">
            Inteligencia, Estudio Creativo, Operaciones y un Orquestador que
            cierra el día en una sola página. Todo gasto, toda escalada, toda
            decisión que cuesta dinero pasa por ti.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login?mode=sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Crear tu cuenta <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-black hover:border-neutral-500"
            >
              Ver precios
            </Link>
          </div>
        </section>

        <section className="border-t border-neutral-200 py-8">
          <p className="text-sm text-neutral-500">
            Privado. Los datos de tu tienda son tuyos — se sincronizan en tu
            horario, se guardan en tu tenant, nunca se revenden.
          </p>
        </section>

        <section id="capabilities" className="py-24 sm:py-32">
          <p className="mb-14 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Los 4 pilares
          </p>
          <div className="grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <div key={c.n} className="border-t border-neutral-200 pt-6">
                <span className="block font-mono text-sm text-neutral-500">
                  {c.n}
                </span>
                <h3 className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl">
                  {c.title}
                </h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-700">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="py-24 sm:py-32">
          <p className="mb-14 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Cómo funciona
          </p>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {METHOD.map(({ k, v }, i) => (
              <div key={k} className="flex flex-col gap-3">
                <span className="font-mono text-sm text-neutral-500">
                  0{i + 1}
                </span>
                <h3 className="text-3xl font-medium tracking-tight sm:text-4xl">
                  {k}
                </h3>
                <p className="text-base leading-relaxed text-neutral-700">
                  {v}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-24 sm:py-32">
          <p className="mb-14 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Resultados
          </p>
          <div className="grid grid-cols-2 gap-x-10 gap-y-12 sm:grid-cols-4">
            {METRICS.map(({ v, k }) => (
              <div key={k} className="border-t border-neutral-200 pt-5">
                <p className="text-4xl font-medium tracking-tight sm:text-5xl">
                  {v}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {k}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-neutral-200 py-24 sm:py-32">
          <h2 className="max-w-4xl text-4xl font-medium leading-[1.05] tracking-[-0.02em] sm:text-6xl">
            Deja de adivinar tus márgenes.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-neutral-700">
            Conecta tu primera tienda en un par de minutos.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/login?mode=sign-up"
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Comenzar <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-black hover:border-neutral-500"
            >
              Ver precios <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 py-10 text-sm text-neutral-500">
          <span>© {new Date().getFullYear()} EcomOS</span>
          <nav className="flex flex-wrap gap-6">
            <Link href="/pricing" className="hover:text-black">
              Precios
            </Link>
            <Link href="/privacy" className="hover:text-black">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-black">
              Términos
            </Link>
            <Link href="/data-deletion" className="hover:text-black">
              Eliminación de datos
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
