import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";

const ERRORS: Record<string, string> = {
  name: "Elige un nombre de workspace entre 2 y 80 caracteres.",
  failed: "No pudimos crear tu workspace. Intenta de nuevo.",
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (existing) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
          E
        </span>
        <span className="text-base font-medium tracking-tight text-neutral-900">EcomOS</span>
      </Link>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        Paso 1 de 1
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        Configura tu workspace
      </h1>
      <p className="mt-3 text-sm text-neutral-600">
        Un workspace agrupa tus tiendas, cuentas de pauta y equipo. Puedes invitar colegas una vez creado.
      </p>

      <form method="POST" action="/api/onboarding" className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-700">Nombre del workspace</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={user.email?.split("@")[0]}
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        {error && ERRORS[error] && (
          <p className="text-sm text-red-600">{ERRORS[error]}</p>
        )}
        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Crear workspace <ArrowRight size={14} />
        </button>
      </form>

      <p className="mt-10 text-xs text-neutral-500">
        ¿Fuiste invitado al workspace de alguien más? Abre el enlace de invitación que te enviaron en su lugar.
      </p>
    </main>
  );
}
