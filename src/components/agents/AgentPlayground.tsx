"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Search, ShieldCheck, Telescope } from "lucide-react";

type Opportunity = {
  productId: string;
  productTitle: string;
  cost: number;
  estimatedRetailPrice: number;
  margin: number;
  shippingCost: number;
  opportunityScore: number;
  confidence: number;
  reasoning: string[];
};

type Filters = {
  minMargin: number;
  maxCost: number;
  maxShipping: number;
  competitionLevel: "" | "low" | "medium" | "high";
};

const initialFilters: Filters = {
  minMargin: 0.4,
  maxCost: 50,
  maxShipping: 10,
  competitionLevel: "",
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);

export default function AgentPlayground({ storeId }: { storeId: string }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  async function analyze(overrides: Partial<Filters> = {}) {
    const nextFilters = { ...filters, ...overrides };
    setFilters(nextFilters);
    setSearching(true);
    setError("");

    try {
      const response = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          minMargin: nextFilters.minMargin || undefined,
          maxCost: nextFilters.maxCost || undefined,
          maxShipping: nextFilters.maxShipping || undefined,
          competitionLevel: nextFilters.competitionLevel || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudieron analizar las oportunidades.");
      }

      setResults(data.results ?? []);
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error al analizar.");
    } finally {
      setSearching(false);
    }
  }

  function updateFilter<Key extends keyof Filters>(key: Key, value: Filters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <section className="glass rise-in overflow-hidden p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold-hi">
              <Bot size={21} strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-hi">Product Scout</h2>
                <span className="rounded-full border border-teal/30 bg-teal/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal">
                  Prueba segura
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-lo">
                Evalúa oportunidades que ya guardaste en Investigación usando margen, costo,
                envío, competencia y señales de demanda. Esta prueba no consulta fuentes externas
                ni modifica tu tienda.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs text-lo">
            <ShieldCheck size={14} className="text-teal" />
            Solo lectura
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-lo">
            Margen mínimo (%)
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={Math.round(filters.minMargin * 100)}
              onChange={(event) => updateFilter("minMargin", Number(event.target.value) / 100)}
              className="mt-1.5 w-full rounded-xl border border-line-hi bg-ink/60 px-3 py-2.5 text-sm text-hi outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-xs font-medium text-lo">
            Costo máximo (USD)
            <input
              type="number"
              min={0}
              step={5}
              value={filters.maxCost}
              onChange={(event) => updateFilter("maxCost", Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-line-hi bg-ink/60 px-3 py-2.5 text-sm text-hi outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-xs font-medium text-lo">
            Envío máximo (USD)
            <input
              type="number"
              min={0}
              step={1}
              value={filters.maxShipping}
              onChange={(event) => updateFilter("maxShipping", Number(event.target.value))}
              className="mt-1.5 w-full rounded-xl border border-line-hi bg-ink/60 px-3 py-2.5 text-sm text-hi outline-none focus:border-gold/60"
            />
          </label>
          <label className="text-xs font-medium text-lo">
            Competencia
            <select
              value={filters.competitionLevel}
              onChange={(event) =>
                updateFilter("competitionLevel", event.target.value as Filters["competitionLevel"])
              }
              className="mt-1.5 w-full rounded-xl border border-line-hi bg-ink/60 px-3 py-2.5 text-sm text-hi outline-none focus:border-gold/60"
            >
              <option value="">Cualquiera</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => analyze()}
            disabled={searching}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold-hi disabled:cursor-wait disabled:opacity-60"
          >
            <Search size={15} />
            {searching ? "Analizando..." : "Analizar oportunidades"}
          </button>
          <button
            type="button"
            onClick={() => analyze({ minMargin: 0.5 })}
            disabled={searching}
            className="rounded-xl border border-line-hi px-3 py-2 text-xs text-lo transition-colors hover:border-gold/40 hover:text-hi disabled:opacity-50"
          >
            Buscar margen de 50%+
          </button>
          <button
            type="button"
            onClick={() => analyze({ competitionLevel: "low" })}
            disabled={searching}
            className="rounded-xl border border-line-hi px-3 py-2 text-xs text-lo transition-colors hover:border-gold/40 hover:text-hi disabled:opacity-50"
          >
            Priorizar baja competencia
          </button>
          <Link
            href="/dashboard/research"
            className="ml-auto inline-flex items-center gap-1.5 px-2 py-2 text-xs text-gold-hi hover:text-hi"
          >
            <Telescope size={14} />
            Abrir Investigación
          </Link>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2.5 text-sm text-coral">
            {error}
          </p>
        )}
      </section>

      <section aria-live="polite" className="space-y-3">
        {searching && (
          <div className="glass p-5 text-sm text-lo">Product Scout está revisando la lista guardada…</div>
        )}

        {!searching && searched && results.length === 0 && (
          <div className="glass rise-in p-8 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl italic text-hi">
              No hay oportunidades que coincidan
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-lo">
              Product Scout analiza los productos que ya guardaste en Investigación. Ajusta los
              filtros o agrega oportunidades para probarlo con más datos.
            </p>
            <Link
              href="/dashboard/research"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line-hi px-4 py-2 text-sm text-hi hover:border-gold/50"
            >
              <Telescope size={15} />
              Ir a Investigación
            </Link>
          </div>
        )}

        {!searching && results.length > 0 && (
          <>
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-hi">Oportunidades para revisar</h3>
              <span className="text-xs text-faint">{results.length} resultados · solo lectura</span>
            </div>
            {results.map((item) => (
              <article
                key={item.productId}
                className="glass rise-in flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-hi">{item.productTitle}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-lo">
                    <span>Costo {money(item.cost)}</span>
                    <span>Precio estimado {money(item.estimatedRetailPrice)}</span>
                    <span>Margen {(item.margin * 100).toFixed(0)}%</span>
                    <span>Envío {money(item.shippingCost)}</span>
                  </div>
                  {item.reasoning?.length > 0 && (
                    <p className="mt-2 text-xs leading-5 text-faint">{item.reasoning.slice(0, 2).join(" · ")}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:pl-4">
                  <div className="text-right">
                    <p className="font-mono text-2xl font-semibold text-gold-hi">
                      {item.opportunityScore.toFixed(0)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-faint">Puntuación</p>
                  </div>
                  <span className="rounded-full border border-line-hi px-2.5 py-1 text-xs text-lo">
                    {Math.round(item.confidence * 100)}% confianza
                  </span>
                </div>
              </article>
            ))}
          </>
        )}
      </section>

      <p className="px-1 text-xs leading-5 text-faint">
        Alcance de este panel: ranking directo de oportunidades ya guardadas, sin pasar por el
        modelo. Para preguntar en lenguaje natural usa el chat de arriba. Las acciones sobre
        Shopify/Meta siguen fuera del agente.
      </p>
    </div>
  );
}
