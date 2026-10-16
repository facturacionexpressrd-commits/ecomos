import { CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * Nivel de permiso de una habilidad del agente. Tomado del preset `ecomos_operator`
 * de AISETTINGS (tipos copiados, no instalados: ese paquete no está publicado).
 *
 * auto     → el agente puede ejecutarla sin preguntar (solo lectura)
 * confirm  → requiere confirmación explícita del usuario autenticado
 * approval → requiere pasar por el flujo de aprobaciones de EcomOS
 * human    → solo una persona puede hacerlo; el agente únicamente redacta
 * never    → el agente nunca la ejecuta
 */
export type PermissionLevel = "auto" | "confirm" | "approval" | "human" | "never";

export type AgentSkill = {
  key: string;
  /** Nombre visible en la UI (español). */
  name: string;
  description: string;
  defaultPermission: PermissionLevel;
  /** Capacidad de EcomOS que el servidor exige antes de leer datos. */
  requiredCapability: string;
  /**
   * `true` solo cuando existe una herramienta real conectada a datos de EcomOS.
   * Las habilidades en `false` se muestran como no disponibles: no se simulan.
   */
  available: boolean;
};

/**
 * Registro de habilidades del agente EcomOS Operator. Esta primera versión expone
 * únicamente habilidades de lectura; las de escritura quedan declaradas como no
 * disponibles para que la UI diga la verdad y para que al conectarlas más adelante
 * solo haya que cambiar `available` y añadir la herramienta correspondiente.
 */
export const AGENT_SKILLS: AgentSkill[] = [
  {
    key: "product_scout",
    name: "Product Scout",
    description:
      "Busca, puntúa y compara las oportunidades que ya guardaste en Investigación (margen, costo, envío, competencia y señales de demanda).",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "store_analytics",
    name: "Analítica de tienda",
    description:
      "Resume ingresos, ganancia de contribución, órdenes, catálogo, campañas activas e incidencias abiertas en una ventana de tiempo.",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "catalog_review",
    name: "Revisión de catálogo",
    description: "Consulta productos, variantes, precios, costos registrados e inventario disponible.",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "order_operations",
    name: "Operación de órdenes",
    description:
      "Consulta estado y totales de órdenes y problemas de fulfillment, sin datos identificables del cliente.",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.ordersRead,
    available: true,
  },
  {
    key: "marketing_operations",
    name: "Campañas Meta",
    description: "Consulta estado, presupuesto y métricas disponibles de las campañas de Meta Ads.",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "catalog_management",
    name: "Cambios de catálogo",
    description:
      "Crear, publicar o editar productos y precios. Todavía no está conectada al agente: hazlo desde Productos.",
    defaultPermission: "confirm",
    requiredCapability: CAPABILITIES.productsManage,
    available: false,
  },
  {
    key: "inventory_and_suppliers",
    name: "Inventario y proveedores",
    description:
      "Ajustar inventario o enviar órdenes a proveedores. Todavía no está conectada al agente.",
    defaultPermission: "approval",
    requiredCapability: CAPABILITIES.productsManage,
    available: false,
  },
  {
    key: "campaign_changes",
    name: "Cambios de campañas",
    description:
      "Pausar campañas o cambiar presupuestos. Todavía no está conectada al agente: usa Campañas y Aprobaciones.",
    defaultPermission: "approval",
    requiredCapability: CAPABILITIES.campaignsManage,
    available: false,
  },
  {
    key: "workspace_control",
    name: "Configuración del workspace",
    description:
      "Usuarios, roles, facturación, integraciones y seguridad. El agente nunca los modifica.",
    defaultPermission: "never",
    requiredCapability: CAPABILITIES.orgManageUsers,
    available: false,
  },
];

/** Reglas de producto y seguridad que viajan en el system prompt del agente. */
export const AGENT_GUARDRAILS: string[] = [
  "Di siempre de dónde viene cada dato de EcomOS y a qué ventana de tiempo corresponde.",
  "Distingue entre dato guardado, estimación y dato ausente. Si falta un campo, dilo.",
  "No afirmes que consultaste internet, marketplaces, Shopify en vivo ni catálogos de proveedores: no tienes esas fuentes.",
  "Nunca garantices ventas, ganancias, demanda futura ni tiempos de envío.",
  "No inventes métricas, precios ni tendencias. Si una herramienta no devolvió el número, dilo.",
  "Esta versión es de solo lectura: no creas, publicas, borras ni modificas nada. Propón el cambio y di quién debe aprobarlo.",
];

export const isSkillAvailable = (key: string) =>
  AGENT_SKILLS.some((skill) => skill.key === key && skill.available);
