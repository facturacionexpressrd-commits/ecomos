"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/meta/campaigns", label: "Campaigns" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/exceptions", label: "Exceptions" },
  { href: "/dashboard/integrations", label: "Integrations" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-4 py-2">
          <span className="mr-4 font-semibold">EcomOS</span>
          {LINKS.map(({ href, label }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm ${
                  active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </>
  );
}
