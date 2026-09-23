"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isActive } from "@/components/dashboard/nav";

export default function MobileTopBar() {
  const pathname = usePathname();

  return (
    <div className="glass sticky top-3 z-30 mx-3 mt-3 flex items-center gap-1 overflow-x-auto p-2 lg:hidden">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
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
