"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safePath } from "@/lib/redirect";
import { ArrowRight } from "lucide-react";

const field =
  "w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

export default function LoginForm({ linkExpired, startSignUp }: { linkExpired: boolean; startSignUp?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">(startSignUp ? "sign-up" : "sign-in");
  const [error, setError] = useState<string | null>(
    linkExpired ? "That confirmation link is invalid or has expired. Sign in, or create the account again for a new link." : null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  const nextPath = () => safePath(new URLSearchParams(window.location.search).get("next"));
  const confirmRedirect = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`;

  async function resendConfirmation() {
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error: resendError } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirect() },
    });
    setLoading(false);
    if (resendError) return setError(resendError.message);
    setNotice(`Sent a new confirmation link to ${email}. Check spam too.`);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setCanResend(false);
    setLoading(true);

    const next = nextPath();
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (authError) {
        if (authError.code === "email_not_confirmed") {
          setCanResend(true);
          return setError("Confirm your email first. Didn't get the link? Resend it below.");
        }
        return setError(authError.message);
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmRedirect() },
    });
    setLoading(false);
    if (authError) return setError(authError.message);

    if (!data.session) {
      setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
      setCanResend(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  const isSignIn = mode === "sign-in";

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:grid-cols-2">
      {/* Editorial brand pane — only shows on wide screens, mimics the landing hero. */}
      <aside className="hidden flex-col justify-between border-r border-neutral-200 bg-neutral-50 p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
            E
          </span>
          <span className="text-base font-medium tracking-tight text-neutral-900">EcomOS</span>
        </Link>

        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            12 módulos · un solo sistema
          </p>
          <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-neutral-900 xl:text-5xl">
            El sistema operativo con IA para tu tienda Shopify.
          </h2>
          <p className="mt-5 max-w-md text-sm text-neutral-600">
            Inteligencia, Estudio Creativo, Operaciones y un Orquestador que cierra el día en una sola página.
          </p>
        </div>

        <p className="text-xs text-neutral-500">
          © {new Date().getFullYear()} EcomOS · <Link href="/privacy" className="hover:text-neutral-900">Privacy</Link> · <Link href="/terms" className="hover:text-neutral-900">Terms</Link>
        </p>
      </aside>

      {/* Form pane */}
      <main className="flex min-h-screen flex-col justify-center px-6 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
              E
            </span>
            <span className="text-base font-medium tracking-tight text-neutral-900">EcomOS</span>
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            {isSignIn ? "Inicia sesión" : "Crea tu cuenta"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {isSignIn ? "Entra a tu centro de mando." : "Un paso y estás dentro."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-700">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-700">Contraseña</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={field}
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}
            {canResend && (
              <button
                type="button"
                disabled={loading || !email}
                onClick={resendConfirmation}
                className="text-left text-sm font-medium text-neutral-900 underline underline-offset-4 hover:opacity-80 disabled:opacity-50"
              >
                Reenviar email de confirmación
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "..." : isSignIn ? "Iniciar sesión" : "Crear cuenta"}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          <button
            type="button"
            className="mt-6 text-sm text-neutral-600 hover:text-neutral-900"
            onClick={() => setMode(isSignIn ? "sign-up" : "sign-in")}
          >
            {isSignIn ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </main>
    </div>
  );
}
