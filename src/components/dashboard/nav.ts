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
} from "lucide-react";

/** One list for the desktop rail and the mobile bar, so the two can't drift apart again. */
export const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/stores", label: "Stores", icon: StoreIcon },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/products", label: "Products", icon: Boxes },
  { href: "/dashboard/meta/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/exceptions", label: "Exceptions", icon: TriangleAlert },
  { href: "/dashboard/team", label: "Team", icon: Users2 },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname.startsWith(href);
