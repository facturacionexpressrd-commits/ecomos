import {
  LayoutDashboard,
  Store as StoreIcon,
  Package,
  Boxes,
  Megaphone,
  Users,
  LineChart,
  Plug,
  TriangleAlert,
  Users2,
  CreditCard,
  Telescope,
  ClipboardCheck,
  Bot,
  Radar,
  MessagesSquare,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

export type NavLink = {
  href: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  /** Visible chip color on the dark sidebar (one of the module hues from the OS screenshots). */
  tone?: "lime" | "sky" | "amber" | "violet" | "pink" | "slate";
};

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, tone: "lime" },
  { href: "/dashboard/products", labelKey: "nav.products", icon: Boxes, tone: "sky" },
  { href: "/dashboard/research", labelKey: "nav.research", icon: Telescope, tone: "sky" },
  { href: "/dashboard/competitors", labelKey: "nav.competitors", icon: Radar, tone: "sky" },
  { href: "/dashboard/meta/campaigns", labelKey: "nav.campaigns", icon: Megaphone, tone: "amber" },
  { href: "/dashboard/voz-del-cliente", labelKey: "nav.voiceOfCustomer", icon: MessagesSquare, tone: "amber" },
  { href: "/dashboard/approvals", labelKey: "nav.approvals", icon: ClipboardCheck, tone: "amber" },
  { href: "/dashboard/operations", labelKey: "nav.operations", icon: Clock, tone: "violet" },
  { href: "/dashboard/orders", labelKey: "nav.orders", icon: Package, tone: "violet" },
  { href: "/dashboard/exceptions", labelKey: "nav.exceptions", icon: TriangleAlert, tone: "violet" },
  { href: "/dashboard/stores", labelKey: "nav.stores", icon: StoreIcon, tone: "violet" },
  { href: "/dashboard/integrations", labelKey: "nav.integrations", icon: Plug, tone: "violet" },
  { href: "/dashboard/agents", labelKey: "nav.agents", icon: Bot, tone: "pink" },
  { href: "/dashboard/customers", labelKey: "nav.customers", icon: Users, tone: "pink" },
  { href: "/dashboard/analytics", labelKey: "nav.analytics", icon: LineChart, tone: "slate" },
  { href: "/dashboard/team", labelKey: "nav.team", icon: Users2, tone: "slate" },
  { href: "/billing", labelKey: "nav.billing", icon: CreditCard, tone: "slate" },
];

export type NavGroup = { labelEs: string; links: NavLink[] };

/** 4-pillar grouping for the signed-in sidebar — matches the AI Orchestrator story. */
export const NAV_GROUPS: NavGroup[] = [
  { labelEs: "Orquestador", links: NAV_LINKS.filter((l) => l.tone === "lime") },
  { labelEs: "Inteligencia", links: NAV_LINKS.filter((l) => l.tone === "sky") },
  { labelEs: "Estudio Creativo", links: NAV_LINKS.filter((l) => l.tone === "amber") },
  { labelEs: "Operaciones", links: NAV_LINKS.filter((l) => l.tone === "violet") },
  { labelEs: "Agentes", links: NAV_LINKS.filter((l) => l.tone === "pink") },
  { labelEs: "Ajustes", links: NAV_LINKS.filter((l) => l.tone === "slate") },
];

export const TONE_BG: Record<NonNullable<NavLink["tone"]>, string> = {
  lime: "bg-lime-300/15 text-lime-300",
  sky: "bg-sky-400/15 text-sky-300",
  amber: "bg-amber-400/15 text-amber-300",
  violet: "bg-violet-400/15 text-violet-300",
  pink: "bg-pink-400/15 text-pink-300",
  slate: "bg-slate-400/15 text-slate-300",
};

export const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname.startsWith(href);
