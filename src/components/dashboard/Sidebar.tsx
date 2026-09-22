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
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";

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

type StoreOption = { id: string; name: string; status: string };

export default function Sidebar({ stores }: { stores: StoreOption[] }) {
  const pathname = usePathname();

  return (
    <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-64 flex-col overflow-y-auto p-4 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 pt-1">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-coral text-sm font-bold text-ink">
          E
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg italic text-hi">EcomOS</span>
      </Link>

      <StoreSwitcher stores={stores} />

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-white/8 font-medium text-hi" : "text-lo hover:bg-white/5 hover:text-hi"
              }`}
            >
              <Icon size={17} strokeWidth={1.75} className={active ? "text-gold-hi" : "text-faint"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 pb-1 text-[11px] text-faint">EcomOS · Operations</p>
    </aside>
  );
}
