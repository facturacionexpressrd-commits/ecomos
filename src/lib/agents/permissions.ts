import { CAPABILITIES } from "@/lib/auth/capabilities";
import type { MessageKey } from "@/lib/i18n";

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
  /** Claves de traducción: el texto visible se resuelve donde se renderiza. */
  nameKey: MessageKey;
  descriptionKey: MessageKey;
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
    nameKey: "skill.product_scout.name",
    descriptionKey: "skill.product_scout.description",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "store_analytics",
    nameKey: "skill.store_analytics.name",
    descriptionKey: "skill.store_analytics.description",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "catalog_review",
    nameKey: "skill.catalog_review.name",
    descriptionKey: "skill.catalog_review.description",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "order_operations",
    nameKey: "skill.order_operations.name",
    descriptionKey: "skill.order_operations.description",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.ordersRead,
    available: true,
  },
  {
    key: "marketing_operations",
    nameKey: "skill.marketing_operations.name",
    descriptionKey: "skill.marketing_operations.description",
    defaultPermission: "auto",
    requiredCapability: CAPABILITIES.storeRead,
    available: true,
  },
  {
    key: "catalog_management",
    nameKey: "skill.catalog_management.name",
    descriptionKey: "skill.catalog_management.description",
    defaultPermission: "confirm",
    requiredCapability: CAPABILITIES.productsManage,
    available: false,
  },
  {
    key: "inventory_and_suppliers",
    nameKey: "skill.inventory_and_suppliers.name",
    descriptionKey: "skill.inventory_and_suppliers.description",
    defaultPermission: "approval",
    requiredCapability: CAPABILITIES.productsManage,
    available: false,
  },
  {
    key: "campaign_changes",
    nameKey: "skill.campaign_changes.name",
    descriptionKey: "skill.campaign_changes.description",
    defaultPermission: "approval",
    requiredCapability: CAPABILITIES.campaignsManage,
    available: false,
  },
  {
    key: "workspace_control",
    nameKey: "skill.workspace_control.name",
    descriptionKey: "skill.workspace_control.description",
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
