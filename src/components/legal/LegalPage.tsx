import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:px-10 sm:py-24">
      <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
          E
        </span>
        <span className="text-base font-medium tracking-tight text-neutral-900">EcomOS</span>
      </Link>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Legal
      </p>
      <h1 className="text-4xl font-medium leading-tight tracking-[-0.02em] text-neutral-900 sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-neutral-500">Last updated {updated}</p>

      <div className="legal-prose mt-10 space-y-5 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </div>

      <nav className="mt-16 flex flex-wrap gap-6 border-t border-neutral-200 pt-8 text-sm text-neutral-500">
        <Link href="/privacy" className="hover:text-black">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-black">Terms of Service</Link>
        <Link href="/data-deletion" className="hover:text-black">Data Deletion</Link>
      </nav>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-6 text-lg font-semibold tracking-tight text-neutral-900">
      {children}
    </h2>
  );
}
