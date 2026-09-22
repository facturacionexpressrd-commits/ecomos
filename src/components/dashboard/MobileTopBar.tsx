"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const LINKS = [
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

export default function MobileTopBar() {
  const pathname = usePathname();

  return (
    <div className="glass sticky top-3 z-30 mx-3 mt-3 flex items-center gap-1 overflow-x-auto p-2 lg:hidden">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
              active ? "bg-white/10 font-medium text-hi" : "text-lo"
            }`}
          >
            <Icon size={14} strokeWidth={1.75} className={active ? "text-gold-hi" : "text-faint"} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
