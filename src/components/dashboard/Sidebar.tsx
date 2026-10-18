"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, TONE_BG, isActive } from "@/components/dashboard/nav";
import { useT } from "@/lib/i18n/client";

/** Dark rail sidebar — matches the "AI Orchestrator" screenshots: module chips grouped by pillar.
    Lives outside data-theme="light" visually by hardcoding its own dark palette. */
export default function Sidebar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <aside className="fixed inset-y-3 left-3 z-30 hidden w-56 flex-col rounded-2xl bg-neutral-950 text-neutral-200 shadow-xl lg:flex">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-300 text-sm font-bold text-neutral-950">
          E
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-white">EcomOS</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">AI Operating System</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.labelEs} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {group.labelEs}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.links.map(({ href, labelKey, icon: Icon, tone }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                        active
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md ${
                          tone ? TONE_BG[tone] : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        <Icon size={13} strokeWidth={2} />
                      </span>
                      <span className="truncate">{t(labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-900 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
          </span>
          12 agentes en línea
        </div>
      </div>
    </aside>
  );
}
