import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl italic text-hi">Page not found</p>
      <p className="text-sm text-lo">The link may be old, or the page may have moved.</p>
      <Link href="/dashboard" className="rounded bg-gold px-4 py-2 text-sm text-ink">
        Back to dashboard
      </Link>
    </main>
  );
}
