import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="glass rise-in p-8 sm:p-10">
        <p className="mb-2 text-xs font-medium tracking-[0.2em] text-gold uppercase">EcomOS</p>
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-3xl font-medium text-hi italic">{title}</h1>
        <p className="mb-8 text-xs text-faint">Last updated {updated}</p>
        <div className="legal-prose space-y-5 text-sm leading-relaxed text-lo">{children}</div>
        <nav className="mt-10 flex gap-4 border-t border-line pt-6 text-xs">
          <Link href="/privacy" className="text-lo hover:text-gold-hi">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-lo hover:text-gold-hi">
            Terms of Service
          </Link>
          <Link href="/data-deletion" className="text-lo hover:text-gold-hi">
            Data Deletion
          </Link>
        </nav>
      </div>
    </main>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-2 text-base font-medium text-hi">{children}</h2>;
}
