"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/meta/campaigns", label: "Campaigns" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/exceptions", label: "Exceptions" },
  { href: "/dashboard/integrations", label: "Integrations" },
];

type StoreOption = { id: string; name: string; status: string };

export default function Nav({ stores }: { stores: StoreOption[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("store");
  const currentStoreId = requested && stores.some((s) => s.id === requested) ? requested : stores[0]?.id;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-4 py-2">
        <span className="mr-1 font-semibold">EcomOS</span>
        {currentStoreId && <StoreSwitcher stores={stores} currentStoreId={currentStoreId} />}
        <span className="mx-2 h-5 w-px bg-gray-200" />
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
  );
}
