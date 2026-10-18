"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isActive } from "@/components/dashboard/nav";
import { useT } from "@/lib/i18n/client";

export default function MobileTopBar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <div className="sticky top-3 z-30 mx-3 mt-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-2 shadow-sm lg:hidden">
      {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
              active ? "bg-neutral-900 font-medium text-white" : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            <Icon size={14} strokeWidth={1.75} />
            {t(labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
