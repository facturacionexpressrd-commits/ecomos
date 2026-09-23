"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safePath } from "@/lib/redirect";

const field =
  "rounded-lg border border-line-hi bg-white/5 px-3 py-2.5 text-sm text-hi placeholder:text-faint focus:border-gold/50 focus:outline-none";

export default function LoginForm({ linkExpired }: { linkExpired: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(
    linkExpired ? "That confirmation link is invalid or has expired. Sign in, or create the account again for a new link." : null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    // Where the user was headed (e.g. an invitation link) survives login and email confirmation.
    const next = safePath(new URLSearchParams(window.location.search).get("next"));
    const supabase = createClient();

    if (mode === "sign-in") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (authError) return setError(authError.message);
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
    if (authError) return setError(authError.message);

    // With email confirmation on there is no session yet: say so instead of bouncing back to login.
    if (!data.session) {
      setNotice(`We sent a confirmation link to ${email}. Open it to finish creating your account.`);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="glass rise-in flex flex-col gap-4 p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-coral text-sm font-bold text-ink">
            E
          </span>
          <span className="font-[family-name:var(--font-display)] text-2xl text-hi italic">EcomOS</span>
        </div>
        <p className="text-sm text-lo">{mode === "sign-in" ? "Sign in to your command center." : "Create your account."}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          {error && <p className="text-sm text-coral">{error}</p>}
          {notice && <p className="text-sm text-teal">{notice}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-to-b from-gold-hi to-gold px-3 py-2.5 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
          >
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          type="button"
          className="text-sm text-lo hover:text-hi"
          onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
