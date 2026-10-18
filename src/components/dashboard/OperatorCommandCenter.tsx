import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bot, CircleAlert, Package, Search, Sparkles } from "lucide-react";
import ProductThumb from "@/components/products/ProductThumb";

type ProductSummary = {
  id: string;
  title: string;
  status: string | null;
  raw: unknown;
  variantPrices: number[];
};

type Props = {
  locale: "es" | "en";
  storeId: string;
  storeName: string;
  currency: string;
  revenue14d: number;
  profit14d: number;
  margin: number;
  orders: number;
  inventory: number;
  activeCampaigns: number;
  openExceptions: number;
  productCount: number;
  variantsMissingCost: number;
  metaConnected: boolean;
  revenueTrend: number[];
  products: ProductSummary[];
};

export default function OperatorCommandCenter(props: Props) {
  const en = props.locale === "en";
  const copy = en
    ? {
        eyebrow: "ECOMOS OPERATOR · COMMAND CENTER",
        title: "Your store, at a glance.",
        subtitle: "A clear view of performance and the next actions that need you.",
        connected: "STORE CONNECTED",
        period: "LAST 14 DAYS",
        revenue: "Revenue",
        profit: "Contribution profit",
        margin: "Contribution margin",
        orders: "Orders",
        trend: "Revenue trend",
        products: "Product catalog",
        productCount: "products synced",
        viewProducts: "View catalog",
        product: "Product",
        status: "Status",
        variants: "Variants",
        price: "Price",
        noProducts: "Products will appear here after the first Shopify sync.",
        attention: "Needs your attention",
        allClear: "No open issues. Your connected store is ready.",
        missingCosts: "{count} variants have no cost. Profit is incomplete until costs are added.",
        exceptions: "{count} fulfillment exceptions are waiting for review.",
        connectMeta: "Connect Meta Ads to include advertising spend in profit reporting.",
        review: "Review",
        shortcuts: "Go to a workspace",
        scout: "Product Scout",
        scoutDescription: "Find and compare product opportunities.",
        ordersTitle: "Orders & fulfillment",
        ordersDescription: "Track orders and resolve delivery exceptions.",
        operator: "EcomOS Operator",
        operatorDescription: "Ask about your store, products, orders, and opportunities.",
        readOnly: "READ-ONLY",
        openOperator: "Open Operator",
        sourceNote: "Figures reflect the data currently synced to EcomOS.",
        noTrend: "Financial data will appear after the next sync.",
        unknown: "Unknown",
      }
    : {
        eyebrow: "ECOMOS OPERATOR · CENTRO DE MANDO",
        title: "Tu tienda, de un vistazo.",
        subtitle: "Rendimiento claro y las próximas acciones que necesitan de ti.",
        connected: "TIENDA CONECTADA",
        period: "ÚLTIMOS 14 DÍAS",
        revenue: "Ingresos",
        profit: "Ganancia de contribución",
        margin: "Margen de contribución",
        orders: "Órdenes",
        trend: "Tendencia de ingresos",
        products: "Catálogo de productos",
        productCount: "productos sincronizados",
        viewProducts: "Ver catálogo",
        product: "Producto",
        status: "Estado",
        variants: "Variantes",
        price: "Precio",
        noProducts: "Los productos aparecerán aquí después de la primera sincronización con Shopify.",
        attention: "Necesita tu atención",
        allClear: "No hay incidencias abiertas. Tu tienda conectada está lista.",
        missingCosts: "{count} variantes no tienen costo. La ganancia estará incompleta hasta registrarlos.",
        exceptions: "{count} incidencias de fulfillment esperan revisión.",
        connectMeta: "Conecta Meta Ads para incluir el gasto publicitario en el reporte de ganancias.",
        review: "Revisar",
        shortcuts: "Ir a un espacio de trabajo",
        scout: "Product Scout",
        scoutDescription: "Encuentra y compara oportunidades de productos.",
        ordersTitle: "Órdenes y fulfillment",
        ordersDescription: "Da seguimiento a órdenes y resuelve incidencias de entrega.",
        operator: "EcomOS Operator",
        operatorDescription: "Pregunta sobre tu tienda, productos, órdenes y oportunidades.",
        readOnly: "SOLO LECTURA",
        openOperator: "Abrir Operator",
        sourceNote: "Las cifras reflejan los datos sincronizados actualmente en EcomOS.",
        noTrend: "Los datos financieros aparecerán después de la próxima sincronización.",
        unknown: "Desconocido",
      };

  const money = (value: number) =>
    new Intl.NumberFormat(en ? "en-US" : "es-DO", {
      style: "currency",
      currency: props.currency,
      maximumFractionDigits: 0,
    }).format(value);
  const storeQuery = `?store=${encodeURIComponent(props.storeId)}`;
  const alerts = [
    ...(props.openExceptions > 0
      ? [{ key: "exceptions", text: copy.exceptions.replace("{count}", props.openExceptions.toLocaleString()), href: `/dashboard/exceptions${storeQuery}` }]
      : []),
    ...(props.variantsMissingCost > 0
      ? [{ key: "costs", text: copy.missingCosts.replace("{count}", props.variantsMissingCost.toLocaleString()), href: `/dashboard/products${storeQuery}` }]
      : []),
    ...(!props.metaConnected
      ? [{ key: "meta", text: copy.connectMeta, href: `/dashboard/integrations${storeQuery}` }]
      : []),
  ];

  const min = Math.min(...props.revenueTrend, 0);
  const max = Math.max(...props.revenueTrend, 1);
  const span = Math.max(max - min, 1);
  const chartPoints = props.revenueTrend
    .map((value, index) => {
      const x = props.revenueTrend.length < 2 ? 4 : 4 + (index / (props.revenueTrend.length - 1)) * 92;
      const y = 34 - ((value - min) / span) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  const stats = [
    { label: copy.revenue, value: money(props.revenue14d), accent: "bg-[#d8f76b]" },
    { label: copy.profit, value: money(props.profit14d), accent: "bg-[#e4f6b3]" },
    { label: copy.margin, value: `${props.margin.toFixed(1)}%`, accent: "bg-[#d8f76b]" },
    { label: copy.orders, value: props.orders.toLocaleString(), accent: "bg-[#e4f6b3]" },
  ];

  return (
    <main className="mx-auto max-w-[1500px] rounded-[1.35rem] bg-[#f2f3ef] p-4 text-[#171914] shadow-[0_24px_80px_-36px_rgba(0,0,0,.55)] sm:p-6 xl:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#dfe1d9] pb-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-[#66705a]">
            <span className="h-2 w-2 rounded-full bg-[#a7d52b]" />
            {copy.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">{copy.title}</h1>
          <p className="mt-1 text-sm text-[#65695f]">{props.storeName} · {copy.subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e4bd] bg-[#f8fbea] px-3 py-2 text-[10px] font-bold tracking-wide text-[#51651d]">
          <span className="h-2 w-2 rounded-full bg-[#8ebc16]" />
          {copy.connected}
        </span>
      </header>

      <div className="mb-5 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[.16em] text-[#7a7d72]">{copy.period}</p>
        <p className="text-xs text-[#82857b]">{copy.sourceNote}</p>
      </div>
      <section aria-label={copy.period} className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-[#e1e3dc] bg-white p-4 shadow-[0_2px_8px_rgba(25,30,15,.04)] sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-xs font-medium text-[#6d7168]">{stat.label}</p>
              <span className={`h-2.5 w-2.5 rounded-full ${stat.accent}`} />
            </div>
            <p className="font-mono text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,.8fr)]">
        <section className="space-y-5">
          <article className="rounded-2xl border border-[#e1e3dc] bg-white p-5 shadow-[0_2px_8px_rgba(25,30,15,.04)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{copy.trend}</h2>
                <p className="mt-1 text-xs text-[#7a7d72]">{copy.revenue}</p>
              </div>
              <span className="rounded-lg bg-[#f4f5f1] px-2.5 py-1 font-mono text-xs text-[#60645a]">{props.currency}</span>
            </div>
            {props.revenueTrend.some((value) => value > 0) ? (
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={copy.trend} className="h-32 w-full overflow-visible">
                <polyline points={chartPoints} fill="none" stroke="#9fc924" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-xl bg-[#f7f8f5] px-4 text-center text-sm text-[#777b71]">{copy.noTrend}</div>
            )}
          </article>

          <article className="overflow-hidden rounded-2xl border border-[#e1e3dc] bg-white shadow-[0_2px_8px_rgba(25,30,15,.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceee8] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">{copy.products}</h2>
                <p className="mt-1 text-xs text-[#7a7d72]">{props.productCount.toLocaleString()} {copy.productCount}</p>
              </div>
              <Link href={`/dashboard/products${storeQuery}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#536b1d] hover:text-[#29370d]">
                {copy.viewProducts}<ArrowUpRight size={14} />
              </Link>
            </div>
            {props.products.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-[#f8f9f6] text-[10px] uppercase tracking-[.12em] text-[#7a7d72]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{copy.product}</th>
                      <th className="px-4 py-3 font-semibold">{copy.status}</th>
                      <th className="px-4 py-3 text-right font-semibold">{copy.variants}</th>
                      <th className="px-5 py-3 text-right font-semibold">{copy.price}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.products.map((product) => {
                      const prices = product.variantPrices.filter((price) => price > 0);
                      const low = prices.length ? Math.min(...prices) : null;
                      const high = prices.length ? Math.max(...prices) : null;
                      return (
                        <tr key={product.id} className="border-t border-[#eff0ec]">
                          <td className="px-5 py-3">
                            <Link href={`/dashboard/products/${product.id}${storeQuery}`} className="flex items-center gap-3 font-medium hover:text-[#627d1e]">
                              <ProductThumb raw={product.raw} size={36} />
                              <span className="max-w-[220px] truncate">{product.title}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#666a60]">{product.status?.replace(/_/g, " ") ?? copy.unknown}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-[#55594f]">{product.variantPrices.length}</td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-[#35382f]">{low === null ? "—" : low === high ? money(low) : `${money(low)}–${money(high!)}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-[#777b71]">{copy.noProducts}</p>
            )}
          </article>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#e1e3dc] bg-white p-5 shadow-[0_2px_8px_rgba(25,30,15,.04)]">
            <div className="mb-4 flex items-center gap-2">
              <CircleAlert size={16} className="text-[#708b24]" />
              <h2 className="text-sm font-semibold">{copy.attention}</h2>
              {alerts.length > 0 && <span className="ml-auto rounded-full bg-[#eff5df] px-2 py-0.5 font-mono text-[10px] text-[#536b1d]">{alerts.length}</span>}
            </div>
            {alerts.length ? (
              <ul className="divide-y divide-[#eff0ec]">
                {alerts.map((alert) => (
                  <li key={alert.key} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#9fc924]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-5 text-[#484c43]">{alert.text}</p>
                      <Link href={alert.href} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#526b1c] hover:underline">{copy.review}<ArrowRight size={12} /></Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-[#f7f9f2] p-3 text-xs leading-5 text-[#62675a]">{copy.allClear}</p>
            )}
          </section>

          <Link href={`/dashboard/agents${storeQuery}`} className="group block rounded-2xl bg-[#11140e] p-5 text-white shadow-[0_12px_28px_-18px_rgba(0,0,0,.5)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d8f76b] text-[#1a2110]"><Bot size={18} /></span>
              <span className="rounded-full border border-white/20 px-2 py-1 text-[9px] font-bold tracking-[.14em] text-[#d8f76b]">{copy.readOnly}</span>
            </div>
            <h2 className="text-sm font-semibold">{copy.operator}</h2>
            <p className="mt-1 text-xs leading-5 text-white/65">{copy.operatorDescription}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#d8f76b]">{copy.openOperator}<ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          </Link>

          <section>
            <h2 className="mb-3 px-1 text-[10px] font-bold tracking-[.16em] text-[#767a70]">{copy.shortcuts}</h2>
            <div className="grid gap-2">
              <Link href={`/dashboard/research${storeQuery}`} className="flex items-center gap-3 rounded-xl border border-[#e1e3dc] bg-white p-3 text-sm shadow-[0_2px_8px_rgba(25,30,15,.04)] transition-colors hover:border-[#bfd78b]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f6e6] text-[#607a20]"><Search size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{copy.scout}</span><span className="block text-xs text-[#797d73]">{copy.scoutDescription}</span></span><ArrowRight size={15} className="text-[#888c82]" />
              </Link>
              <Link href={`/dashboard/orders${storeQuery}`} className="flex items-center gap-3 rounded-xl border border-[#e1e3dc] bg-white p-3 text-sm shadow-[0_2px_8px_rgba(25,30,15,.04)] transition-colors hover:border-[#bfd78b]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f6e6] text-[#607a20]"><Package size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{copy.ordersTitle}</span><span className="block text-xs text-[#797d73]">{copy.ordersDescription}</span></span><ArrowRight size={15} className="text-[#888c82]" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
      <div className="sr-only"><Sparkles aria-hidden="true" /> EcomOS</div>
    </main>
  );
}
