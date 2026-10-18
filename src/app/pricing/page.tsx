import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { billingEnabled, stripe } from "@/lib/billing";

export const metadata: Metadata = {
  title: "Precios — EcomOS",
  description: "Un solo plan. Todas las tiendas, todas las integraciones, todo tu equipo.",
};

async function loadPrice(): Promise<{ display: string; interval: string }> {
  if (!billingEnabled() || !process.env.STRIPE_PRICE_ID) {
    return { display: "$49", interval: "mes" };
  }
  try {
    const price = await stripe().prices.retrieve(process.env.STRIPE_PRICE_ID);
    const amount = (price.unit_amount ?? 0) / 100;
    const currency = (price.currency ?? "usd").toUpperCase();
    const symbol = currency === "USD" ? "$" : `${currency} `;
    return {
      display: `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      interval: price.recurring?.interval === "year" ? "año" : "mes",
    };
  } catch {
    return { display: "$49", interval: "mes" };
  }
}

const INCLUDES = [
  "Tiendas Shopify ilimitadas",
  "Productos, variantes y órdenes sin tope",
  "Meta Ads: leer, crear, pausar, activar, duplicar",
  "CJ Dropshipping: vinculado de variantes + envío de órdenes",
  "Ganancia por variante (ingresos − devoluciones − comisiones − COGS)",
  "Re-sync nocturno completo + webhooks en vivo",
  "Invitaciones de equipo con roles",
  "Tokens cifrados (AES-256-GCM) y audit log",
  "Webhooks de cumplimiento GDPR",
  "Cancela cuando quieras desde el portal de facturación",
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { display, interval } = await loadPrice();
  const ctaHref = user ? "/billing" : "/login?mode=sign-up&next=/billing";
  const ctaLabel = user ? "Suscribirse" : "Crear cuenta y suscribirse";

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
        <header className="flex items-center justify-between pt-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
              E
            </span>
            <span className="text-base font-medium tracking-tight">EcomOS</span>
          </Link>
          <nav className="flex items-center gap-7 text-sm">
            <Link href="/" className="text-neutral-700 hover:text-black">
              Producto
            </Link>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="text-neutral-700 hover:text-black"
            >
              {user ? "Panel" : "Iniciar sesión"}
            </Link>
          </nav>
        </header>

        <section className="pt-24 pb-16 sm:pt-32 sm:pb-20">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Precios
          </p>
          <h1 className="max-w-3xl text-5xl font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
            Un solo plan. Todo incluido.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-700">
            Sin tramos por usuario, sin pagos por tienda, sin integraciones de pago extra. Cancela cuando quieras.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              EcomOS
            </p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-mono text-6xl font-semibold tracking-tight text-neutral-900">
                {display}
              </span>
              <span className="text-sm text-neutral-500">/ {interval}</span>
            </div>
            <p className="mt-3 text-sm text-neutral-600">Facturado mensual. Sin contratos anuales.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <form method="POST" action="/api/billing/checkout">
                {user ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
                    type="submit"
                  >
                    {ctaLabel} <ArrowRight size={16} />
                  </button>
                ) : (
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    {ctaLabel} <ArrowRight size={16} />
                  </Link>
                )}
              </form>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 hover:border-neutral-500"
              >
                Volver al producto
              </Link>
            </div>

            <ul className="mt-10 grid grid-cols-1 gap-y-3 border-t border-neutral-200 pt-8 sm:grid-cols-2 sm:gap-x-6">
              {INCLUDES.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-neutral-900" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 sm:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              ¿Necesitas algo más grande?
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">
              Enterprise
            </h2>
            <p className="mt-3 text-sm text-neutral-700">
              Mayor cuota de API, SSO, SLA personalizado, facturación tradicional y soporte dedicado.
            </p>
            <a
              href="mailto:rreyes325@gmail.com?subject=EcomOS%20Enterprise"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 hover:border-neutral-500"
            >
              Contactar ventas <ArrowRight size={14} />
            </a>
            <div className="mt-10 border-t border-neutral-200 pt-6 text-xs text-neutral-600">
              <p className="font-semibold text-neutral-900">¿Preguntas?</p>
              <p className="mt-1">
                Mira el{" "}
                <Link href="/" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                  producto
                </Link>
                , los{" "}
                <Link href="/terms" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                  términos
                </Link>{" "}
                o la{" "}
                <Link href="/privacy" className="text-neutral-900 underline underline-offset-4 hover:no-underline">
                  política de privacidad
                </Link>
                .
              </p>
            </div>
          </aside>
        </section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 py-10 text-sm text-neutral-500">
          <span>© {new Date().getFullYear()} EcomOS</span>
          <nav className="flex flex-wrap gap-6">
            <Link href="/" className="hover:text-black">Producto</Link>
            <Link href="/privacy" className="hover:text-black">Privacidad</Link>
            <Link href="/terms" className="hover:text-black">Términos</Link>
            <Link href="/data-deletion" className="hover:text-black">Eliminación de datos</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
