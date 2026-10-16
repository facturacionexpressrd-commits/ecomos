import { prisma } from "@/lib/db";
import { OpportunityScorer } from "@/lib/research/scoring";
import { ACTIVE_META } from "@/lib/meta/status";
import { CAPABILITIES, hasCapability, type StoreAccessGrant } from "@/lib/auth/capabilities";

/** Contexto que el endpoint arma después de autenticar y verificar acceso a la tienda. */
export type ToolContext = {
  storeId: string;
  grants: StoreAccessGrant[];
};

/** Etiqueta de fuente que la UI muestra debajo de cada respuesta. */
export type ToolSource = { label: string; window?: string };

export type ToolRun = {
  /** Datos mínimos que se envían a Claude. Nunca filas completas de la base. */
  data: unknown;
  source: ToolSource;
};

export type AgentTool = {
  name: string;
  skillKey: string;
  description: string;
  requiredCapability: string;
  /** Esquema que se publica a Claude (formato de herramientas de la API de Anthropic). */
  inputSchema: Record<string, unknown>;
  /** Valida y normaliza los argumentos del modelo. Lanza `ToolInputError` si no sirven. */
  parseInput: (raw: unknown) => Record<string, unknown>;
  run: (ctx: ToolContext, input: Record<string, unknown>) => Promise<ToolRun>;
};

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

/** Decimal de Prisma, number o null → number o null. Nunca convierte ausencia en cero. */
const num = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && "toNumber" in (value as object)) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return null;
};

const asRecord = (raw: unknown): Record<string, unknown> => {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ToolInputError("Los argumentos deben ser un objeto.");
  }
  return raw as Record<string, unknown>;
};

/** Enteros acotados: evita que el modelo pida ventanas o listas enormes. */
const boundedInt = (raw: unknown, name: string, min: number, max: number, fallback: number) => {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) throw new ToolInputError(`"${name}" debe ser un número.`);
  return Math.min(max, Math.max(min, Math.round(value)));
};

const optionalNumber = (raw: unknown, name: string, min: number, max: number) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) throw new ToolInputError(`"${name}" debe ser un número.`);
  if (value < min || value > max) {
    throw new ToolInputError(`"${name}" debe estar entre ${min} y ${max}.`);
  }
  return value;
};

const optionalEnum = <T extends string>(raw: unknown, name: string, allowed: readonly T[]) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string" || !allowed.includes(raw as T)) {
    throw new ToolInputError(`"${name}" debe ser uno de: ${allowed.join(", ")}.`);
  }
  return raw as T;
};

const optionalText = (raw: unknown, name: string, maxLength = 120) => {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") throw new ToolInputError(`"${name}" debe ser texto.`);
  const trimmed = raw.trim();
  if (trimmed.length > maxLength) throw new ToolInputError(`"${name}" es demasiado largo.`);
  return trimmed || undefined;
};

const COMPETITION = ["low", "medium", "high"] as const;
const windowLabel = (days: number) => `últimos ${days} días`;
const since = (days: number) => new Date(Date.now() - days * 86_400_000);

/**
 * Oportunidades guardadas en la lista de Investigación, re-puntuadas con el
 * `OpportunityScorer` que ya usa el resto del producto (no se inventa otro puntaje).
 */
const buscarOportunidades: AgentTool = {
  name: "buscar_oportunidades_guardadas",
  skillKey: "product_scout",
  description:
    "Busca y puntúa las oportunidades de producto guardadas en la lista de Investigación de esta tienda. " +
    "Solo lee datos guardados en EcomOS: no consulta internet, marketplaces, Shopify ni catálogos de proveedores.",
  requiredCapability: CAPABILITIES.storeRead,
  inputSchema: {
    type: "object",
    properties: {
      margenMinimo: { type: "number", description: "Margen mínimo entre 0 y 1 (0.4 = 40%)." },
      costoMaximo: { type: "number", description: "Costo unitario máximo en USD." },
      envioMaximo: { type: "number", description: "Costo de envío máximo en USD." },
      competencia: { type: "string", enum: [...COMPETITION], description: "Nivel de competencia." },
      limite: { type: "number", description: "Cantidad máxima de resultados (1-20, por defecto 10)." },
    },
    additionalProperties: false,
  },
  parseInput: (raw) => {
    const input = asRecord(raw);
    return {
      margenMinimo: optionalNumber(input.margenMinimo, "margenMinimo", 0, 1),
      costoMaximo: optionalNumber(input.costoMaximo, "costoMaximo", 0, 1_000_000),
      envioMaximo: optionalNumber(input.envioMaximo, "envioMaximo", 0, 1_000_000),
      competencia: optionalEnum(input.competencia, "competencia", COMPETITION),
      limite: boundedInt(input.limite, "limite", 1, 20, 10),
    };
  },
  run: async (ctx, input) => {
    const items = await prisma.researchWatchlist.findMany({
      where: {
        storeId: ctx.storeId,
        status: { not: "archived" },
        cost: input.costoMaximo !== undefined ? { lte: input.costoMaximo as number } : undefined,
        margin: input.margenMinimo !== undefined ? { gte: input.margenMinimo as number } : undefined,
        shippingCost:
          input.envioMaximo !== undefined ? { lte: input.envioMaximo as number } : undefined,
        competitionLevel: input.competencia as string | undefined,
      },
      orderBy: { opportunityScore: "desc" },
      take: input.limite as number,
    });

    const scorer = new OpportunityScorer();
    const results = items.map((item) => {
      const shipping = num(item.shippingCost);
      const scored = scorer.scoreOpportunity(
        item.id,
        item.productTitle,
        num(item.cost) ?? 0,
        num(item.estimatedRetailPrice) ?? 0,
        shipping ?? 0,
        item.competitionLevel as "low" | "medium" | "high",
        item.demandSignals
      );
      return {
        titulo: scored.productTitle,
        costo: scored.cost,
        precioRetailEstimado: scored.estimatedRetailPrice,
        margen: Number(scored.margin.toFixed(4)),
        // Distingue "sin dato" de "cero": el puntaje trata null como 0, el agente debe saberlo.
        envio: shipping,
        envioRegistrado: shipping !== null,
        competencia: item.competitionLevel,
        senalesDemanda: item.demandSignals,
        puntaje: Number(scored.opportunityScore.toFixed(1)),
        desglosePuntaje: scored.scoreBreakdown,
        confianza: scored.confidence,
        explicacion: scored.reasoning,
        estado: item.status,
        guardadoEl: item.createdAt.toISOString().slice(0, 10),
        notas: item.notes ? item.notes.slice(0, 280) : null,
      };
    });

    return {
      data: {
        total: results.length,
        criterios: input,
        oportunidades: results,
        nota:
          results.length === 0
            ? "No hay oportunidades guardadas que cumplan estos criterios. El usuario debe agregarlas en el área de Investigación."
            : "Puntaje calculado por OpportunityScorer de EcomOS sobre datos guardados en la lista de Investigación.",
      },
      source: { label: "Investigación guardada" },
    };
  },
};

/** Resumen financiero y operativo de la tienda en una ventana de días. */
const resumenTienda: AgentTool = {
  name: "resumen_tienda",
  skillKey: "store_analytics",
  description:
    "Resumen de la tienda en una ventana de días: ingresos, reembolsos, comisiones, COGS y ganancia de " +
    "contribución (métricas diarias ya calculadas), cantidad de órdenes, productos, campañas Meta activas e " +
    "incidencias de fulfillment abiertas.",
  requiredCapability: CAPABILITIES.storeRead,
  inputSchema: {
    type: "object",
    properties: {
      dias: { type: "number", description: "Ventana en días (1-180, por defecto 30)." },
    },
    additionalProperties: false,
  },
  parseInput: (raw) => ({ dias: boundedInt(asRecord(raw).dias, "dias", 1, 180, 30) }),
  run: async (ctx, input) => {
    const dias = input.dias as number;
    const from = since(dias);

    const [metrics, orders, productCount, campaigns, openExceptions, store] = await Promise.all([
      prisma.dailyFinancialMetric.findMany({
        where: { storeId: ctx.storeId, date: { gte: from } },
        select: {
          grossRevenue: true,
          refunds: true,
          fees: true,
          cogs: true,
          contributionProfit: true,
        },
      }),
      prisma.order.aggregate({
        where: { storeId: ctx.storeId, placedAt: { gte: from } },
        _count: true,
        _sum: { totalPrice: true },
      }),
      prisma.product.count({ where: { storeId: ctx.storeId } }),
      prisma.metaCampaign.count({ where: { storeId: ctx.storeId, status: "ACTIVE" } }),
      prisma.fulfillmentException.count({
        where: { supplierOrder: { storeId: ctx.storeId }, isResolved: false },
      }),
      prisma.store.findFirst({
        where: { id: ctx.storeId },
        select: { status: true, ordersSyncedAt: true, productsSyncedAt: true },
      }),
    ]);

    const sum = (key: "grossRevenue" | "refunds" | "fees" | "cogs" | "contributionProfit") =>
      Number(metrics.reduce((total, row) => total + (num(row[key]) ?? 0), 0).toFixed(2));

    return {
      data: {
        ventana: windowLabel(dias),
        diasConMetricas: metrics.length,
        // Las métricas diarias las calcula un job: si faltan días, el total es parcial.
        metricasCompletas: metrics.length >= dias,
        ingresosBrutos: metrics.length ? sum("grossRevenue") : null,
        reembolsos: metrics.length ? sum("refunds") : null,
        comisionesEstimadas: metrics.length ? sum("fees") : null,
        cogs: metrics.length ? sum("cogs") : null,
        gananciaContribucion: metrics.length ? sum("contributionProfit") : null,
        ordenes: orders._count,
        totalOrdenes: num(orders._sum.totalPrice),
        productosEnCatalogo: productCount,
        campanasMetaActivas: campaigns,
        incidenciasFulfillmentAbiertas: openExceptions,
        estadoTienda: store?.status ?? null,
        ultimaSincronizacionOrdenes: store?.ordersSyncedAt?.toISOString() ?? null,
        ultimaSincronizacionProductos: store?.productsSyncedAt?.toISOString() ?? null,
        nota:
          "Las comisiones son una estimación (porcentaje configurado en la tienda), no cobros reales de Shopify. " +
          "Si faltan días con métricas, los totales son parciales.",
      },
      source: { label: "Métricas de tienda", window: windowLabel(dias) },
    };
  },
};

/** Catálogo con variantes, precios, costos registrados e inventario. */
const listarProductos: AgentTool = {
  name: "listar_productos",
  skillKey: "catalog_review",
  description:
    "Lista productos de la tienda con sus variantes: SKU, precio, costo registrado manualmente e inventario " +
    "disponible. El costo puede estar vacío si nadie lo registró.",
  requiredCapability: CAPABILITIES.storeRead,
  inputSchema: {
    type: "object",
    properties: {
      busqueda: { type: "string", description: "Texto a buscar en el título del producto." },
      limite: { type: "number", description: "Cantidad máxima de productos (1-25, por defecto 10)." },
      soloSinCosto: {
        type: "boolean",
        description: "Solo productos con alguna variante sin costo registrado.",
      },
    },
    additionalProperties: false,
  },
  parseInput: (raw) => {
    const input = asRecord(raw);
    return {
      busqueda: optionalText(input.busqueda, "busqueda"),
      limite: boundedInt(input.limite, "limite", 1, 25, 10),
      soloSinCosto: input.soloSinCosto === true,
    };
  },
  run: async (ctx, input) => {
    const products = await prisma.product.findMany({
      where: {
        storeId: ctx.storeId,
        title: input.busqueda
          ? { contains: input.busqueda as string, mode: "insensitive" }
          : undefined,
        variants: input.soloSinCosto ? { some: { cost: null } } : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: input.limite as number,
      select: {
        title: true,
        status: true,
        variants: {
          take: 10,
          select: {
            sku: true,
            title: true,
            price: true,
            cost: true,
            inventoryLevels: { select: { available: true } },
          },
        },
      },
    });

    return {
      data: {
        total: products.length,
        productos: products.map((product) => ({
          titulo: product.title,
          estado: product.status,
          variantes: product.variants.map((variant) => ({
            sku: variant.sku,
            titulo: variant.title,
            precio: num(variant.price),
            costo: num(variant.cost),
            costoRegistrado: variant.cost !== null,
            inventarioDisponible: variant.inventoryLevels.length
              ? variant.inventoryLevels.reduce((total, level) => total + level.available, 0)
              : null,
          })),
        })),
        nota:
          "Catálogo sincronizado desde Shopify. El costo es entrada manual por variante; sin costo no se " +
          "puede calcular margen real.",
      },
      source: { label: "Catálogo de productos" },
    };
  },
};

/** Órdenes sin datos identificables del cliente. */
const listarOrdenes: AgentTool = {
  name: "listar_ordenes",
  skillKey: "order_operations",
  description:
    "Resume las órdenes de una ventana de días: cantidad, total, moneda y estado financiero agregado, más " +
    "las órdenes más recientes por número, fecha, total y estado. No devuelve nombre, correo, teléfono ni " +
    "dirección del cliente.",
  requiredCapability: CAPABILITIES.ordersRead,
  inputSchema: {
    type: "object",
    properties: {
      dias: { type: "number", description: "Ventana en días (1-180, por defecto 30)." },
      limite: { type: "number", description: "Órdenes recientes a detallar (1-20, por defecto 10)." },
      estadoFinanciero: {
        type: "string",
        description: "Filtro por estado financiero de Shopify (ej. paid, pending, refunded).",
      },
    },
    additionalProperties: false,
  },
  parseInput: (raw) => {
    const input = asRecord(raw);
    return {
      dias: boundedInt(input.dias, "dias", 1, 180, 30),
      limite: boundedInt(input.limite, "limite", 1, 20, 10),
      estadoFinanciero: optionalText(input.estadoFinanciero, "estadoFinanciero", 40),
    };
  },
  run: async (ctx, input) => {
    const dias = input.dias as number;
    const where = {
      storeId: ctx.storeId,
      placedAt: { gte: since(dias) },
      financialStatus: input.estadoFinanciero as string | undefined,
    };

    const [aggregate, byStatus, recent] = await Promise.all([
      prisma.order.aggregate({ where, _count: true, _sum: { totalPrice: true } }),
      prisma.order.groupBy({ by: ["financialStatus"], where, _count: true }),
      prisma.order.findMany({
        where,
        orderBy: { placedAt: "desc" },
        take: input.limite as number,
        // Campos explícitos: `raw` y `customerId` nunca salen de aquí.
        select: {
          name: true,
          totalPrice: true,
          currency: true,
          financialStatus: true,
          placedAt: true,
        },
      }),
    ]);

    return {
      data: {
        ventana: windowLabel(dias),
        ordenes: aggregate._count,
        totalVendido: num(aggregate._sum.totalPrice),
        porEstadoFinanciero: byStatus.map((row) => ({
          estado: row.financialStatus ?? "sin_estado",
          cantidad: row._count,
        })),
        recientes: recent.map((order) => ({
          numero: order.name,
          total: num(order.totalPrice),
          moneda: order.currency,
          estadoFinanciero: order.financialStatus,
          fecha: order.placedAt.toISOString().slice(0, 10),
        })),
        nota: "Sin datos del cliente por diseño. El total de Shopify ya viene neto de reembolsos.",
      },
      source: { label: "Órdenes", window: windowLabel(dias) },
    };
  },
};

/** Incidencias de fulfillment abiertas, sin datos del cliente. */
const problemasFulfillment: AgentTool = {
  name: "problemas_fulfillment",
  skillKey: "order_operations",
  description:
    "Lista las incidencias de fulfillment de las órdenes a proveedor: tipo, severidad, descripción, acción " +
    "recomendada registrada y si están resueltas. No incluye datos del cliente.",
  requiredCapability: CAPABILITIES.ordersRead,
  inputSchema: {
    type: "object",
    properties: {
      incluirResueltas: {
        type: "boolean",
        description: "Incluir también las resueltas (por defecto no).",
      },
      limite: { type: "number", description: "Cantidad máxima (1-25, por defecto 15)." },
    },
    additionalProperties: false,
  },
  parseInput: (raw) => {
    const input = asRecord(raw);
    return {
      incluirResueltas: input.incluirResueltas === true,
      limite: boundedInt(input.limite, "limite", 1, 25, 15),
    };
  },
  run: async (ctx, input) => {
    const exceptions = await prisma.fulfillmentException.findMany({
      where: {
        supplierOrder: { storeId: ctx.storeId },
        isResolved: input.incluirResueltas ? undefined : false,
      },
      orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
      take: input.limite as number,
      select: {
        exceptionType: true,
        severity: true,
        description: true,
        recommendedAction: true,
        isResolved: true,
        createdAt: true,
        supplierOrder: {
          select: { supplier: true, status: true, order: { select: { name: true } } },
        },
      },
    });

    return {
      data: {
        total: exceptions.length,
        incidencias: exceptions.map((item) => ({
          tipo: item.exceptionType,
          severidad: item.severity,
          descripcion: item.description.slice(0, 280),
          accionRecomendada: item.recommendedAction?.slice(0, 280) ?? null,
          resuelta: item.isResolved,
          creadaEl: item.createdAt.toISOString().slice(0, 10),
          proveedor: item.supplierOrder.supplier,
          estadoOrdenProveedor: item.supplierOrder.status,
          ordenShopify: item.supplierOrder.order.name,
        })),
        nota:
          "Incidencias registradas por el flujo de fulfillment de EcomOS, no por el transportista en vivo.",
      },
      source: { label: "Incidencias de fulfillment" },
    };
  },
};

/** Campañas Meta con las métricas que están sincronizadas en EcomOS. */
const campanasMeta: AgentTool = {
  name: "campanas_meta",
  skillKey: "marketing_operations",
  description:
    "Lista las campañas de Meta Ads de la tienda con estado, objetivo, presupuesto diario, gasto total, " +
    "impresiones, clics y conversiones ya sincronizados en EcomOS, más la fecha de la última sincronización.",
  requiredCapability: CAPABILITIES.storeRead,
  inputSchema: {
    type: "object",
    properties: {
      estado: { type: "string", description: "Filtro por estado de Meta (ej. ACTIVE, PAUSED)." },
      limite: { type: "number", description: "Cantidad máxima (1-25, por defecto 15)." },
    },
    additionalProperties: false,
  },
  parseInput: (raw) => {
    const input = asRecord(raw);
    return {
      estado: optionalText(input.estado, "estado", 40),
      limite: boundedInt(input.limite, "limite", 1, 25, 15),
    };
  },
  run: async (ctx, input) => {
    const campaigns = await prisma.metaCampaign.findMany({
      where: { storeId: ctx.storeId, status: input.estado as string | undefined },
      orderBy: { totalSpend: "desc" },
      take: input.limite as number,
      select: {
        name: true,
        status: true,
        objective: true,
        dailyBudget: true,
        totalSpend: true,
        impressions: true,
        clicks: true,
        conversions: true,
        syncedAt: true,
      },
    });

    return {
      data: {
        total: campaigns.length,
        campanas: campaigns.map((campaign) => ({
          nombre: campaign.name,
          estado: campaign.status,
          objetivo: campaign.objective,
          presupuestoDiario: num(campaign.dailyBudget),
          gastoTotal: num(campaign.totalSpend),
          impresiones: campaign.impressions,
          clics: campaign.clicks,
          conversiones: campaign.conversions,
          sincronizadaEl: campaign.syncedAt?.toISOString() ?? null,
        })),
        nota:
          "Métricas según la última sincronización con Meta, no en tiempo real. EcomOS no calcula ROAS aquí.",
      },
      source: { label: "Campañas Meta" },
    };
  },
};

/** Estado de integraciones a alto nivel. Nunca credenciales ni tokens. */
const estadoIntegraciones: AgentTool = {
  name: "estado_integraciones",
  skillKey: "store_analytics",
  description:
    "Estado a alto nivel de las integraciones de la tienda: Shopify, Meta Ads y proveedores. Devuelve solo " +
    "si están conectadas y cuándo se sincronizaron; nunca tokens ni credenciales.",
  requiredCapability: CAPABILITIES.storeRead,
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  parseInput: (raw) => {
    asRecord(raw);
    return {};
  },
  run: async (ctx) => {
    const [store, shopifyTokens, metaAccounts, supplierLinks] = await Promise.all([
      prisma.store.findFirst({
        where: { id: ctx.storeId },
        select: {
          platform: true,
          status: true,
          connectedAt: true,
          productsSyncedAt: true,
          ordersSyncedAt: true,
          customersSyncedAt: true,
        },
      }),
      // Un conteo, no un select: la columna cifrada nunca se carga en memoria.
      prisma.store.count({
        where: { id: ctx.storeId, accessTokenEncrypted: { not: null } },
      }),
      prisma.metaAccount.findMany({
        where: { storeId: ctx.storeId },
        select: { status: true, lastSyncedAt: true },
      }),
      prisma.supplierLink.groupBy({
        by: ["supplier"],
        where: { storeId: ctx.storeId },
        _count: true,
      }),
    ]);

    return {
      data: {
        shopify: {
          plataforma: store?.platform ?? null,
          estado: store?.status ?? null,
          conectada: shopifyTokens > 0,
          conectadaEl: store?.connectedAt?.toISOString() ?? null,
          productosSincronizados: store?.productsSyncedAt?.toISOString() ?? null,
          ordenesSincronizadas: store?.ordersSyncedAt?.toISOString() ?? null,
          clientesSincronizados: store?.customersSyncedAt?.toISOString() ?? null,
        },
        meta: {
          cuentas: metaAccounts.length,
          cuentasUsables: metaAccounts.filter((account) =>
            ACTIVE_META.status.in.includes(account.status as "connected" | "error")
          ).length,
          estados: metaAccounts.map((account) => account.status),
          ultimaSincronizacion:
            metaAccounts
              .map((account) => account.lastSyncedAt?.toISOString())
              .filter((value): value is string => Boolean(value))
              .sort()
              .at(-1) ?? null,
        },
        proveedores: supplierLinks.map((row) => ({
          proveedor: row.supplier,
          variantesVinculadas: row._count,
        })),
        nota:
          "Runable (orquestación externa de campañas) es una integración aparte y no está conectada a este agente.",
      },
      source: { label: "Estado de integraciones" },
    };
  },
};

export const AGENT_TOOLS: AgentTool[] = [
  buscarOportunidades,
  resumenTienda,
  listarProductos,
  listarOrdenes,
  problemasFulfillment,
  campanasMeta,
  estadoIntegraciones,
];

export const findTool = (name: string) => AGENT_TOOLS.find((tool) => tool.name === name);

/** Herramientas que este usuario puede usar en esta tienda, según sus capacidades. */
export function toolsForGrants(grants: StoreAccessGrant[], storeId: string): AgentTool[] {
  return AGENT_TOOLS.filter((tool) => hasCapability(grants, storeId, tool.requiredCapability));
}

/** Definiciones en el formato que espera la API de Anthropic. */
export const toAnthropicTools = (tools: AgentTool[]) =>
  tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
