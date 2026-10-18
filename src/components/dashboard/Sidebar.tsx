"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isActive } from "@/components/dashboard/nav";
import { useT } from "@/lib/i18n/client";

/** Dark, labeled workspace rail inspired by the EcomOS Operator reference screens. */
export default function Sidebar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col border-r border-white/10 bg-[#090b08] px-3 py-5 text-white lg:flex">
      <Link href="/dashboard" aria-label={t("nav.home")} className="mb-6 flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d8f76b] text-sm font-black text-[#14170e]">E</span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-tight">EcomOS</span>
          <span className="block text-[10px] text-white/45">Commerce workspace</span>
        </span>
      </Link>

      <nav aria-label={t("nav.home")} className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_LINKS.map(({ href, labelKey, icon: Icon }) => {
          const active = isActive(pathname, href);
          const label = t(labelKey);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors ${
                active ? "bg-[#d8f76b] font-semibold text-[#171a10]" : "text-white/65 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span className="truncate">{label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#526c18]" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-white/10 px-3 pt-4">
        <p className="text-[10px] font-medium tracking-[.14em] text-white/40 uppercase">EcomOS Operator</p>
        <p className="mt-1 text-xs text-white/65">Store tools and insights</p>
      </div>
    </aside>
  );
}
