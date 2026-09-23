"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isActive } from "@/components/dashboard/nav";

/** Slim icon rail; each label appears as a tooltip on hover/focus so nothing is icon-only guesswork. */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass fixed inset-y-4 left-4 z-30 hidden w-16 flex-col items-center py-4 lg:flex">
      <Link
        href="/dashboard"
        aria-label="EcomOS home"
        className="mb-6 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-coral text-sm font-bold text-ink"
      >
        E
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                active ? "bg-white/12 text-gold-hi" : "text-faint hover:bg-white/6 hover:text-hi"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="glass pointer-events-none absolute left-full ml-3 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap text-hi opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
