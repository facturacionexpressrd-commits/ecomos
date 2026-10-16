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
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

/**
 * Una sola lista para el riel de escritorio y la barra móvil, para que no se separen otra vez.
 * `labelKey` en lugar de texto fijo: la etiqueta se traduce donde se renderiza.
 */
export const NAV_LINKS: { href: string; labelKey: MessageKey; icon: typeof LayoutDashboard }[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/dashboard/stores", labelKey: "nav.stores", icon: StoreIcon },
  { href: "/dashboard/orders", labelKey: "nav.orders", icon: Package },
  { href: "/dashboard/products", labelKey: "nav.products", icon: Boxes },
  { href: "/dashboard/meta/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
  { href: "/dashboard/research", labelKey: "nav.research", icon: Telescope },
  { href: "/dashboard/agents", labelKey: "nav.agents", icon: Bot },
  { href: "/dashboard/customers", labelKey: "nav.customers", icon: Users },
  { href: "/dashboard/analytics", labelKey: "nav.analytics", icon: LineChart },
  { href: "/dashboard/integrations", labelKey: "nav.integrations", icon: Plug },
  { href: "/dashboard/exceptions", labelKey: "nav.exceptions", icon: TriangleAlert },
  { href: "/dashboard/approvals", labelKey: "nav.approvals", icon: ClipboardCheck },
  { href: "/dashboard/team", labelKey: "nav.team", icon: Users2 },
  { href: "/billing", labelKey: "nav.billing", icon: CreditCard },
];

export const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname.startsWith(href);
