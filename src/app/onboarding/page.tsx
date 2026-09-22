import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  name: "Enter a workspace name between 2 and 80 characters.",
  failed: "We couldn't create your workspace. Please try again.",
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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">Set up your workspace</h1>
      <p className="text-sm text-lo">
        A workspace holds your stores, ad accounts and team. You can invite teammates once it exists.
      </p>
      <form method="POST" action="/api/onboarding" className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Workspace name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={user.email?.split("@")[0]}
            className="rounded border px-3 py-2"
          />
        </label>
        {error && ERRORS[error] && <p className="text-sm text-coral">{ERRORS[error]}</p>}
        <button type="submit" className="rounded bg-gold px-3 py-2 text-ink">
          Create workspace
        </button>
      </form>
      <p className="text-xs text-faint">
        Were you invited to someone else&apos;s workspace? Open the invitation link you were sent instead.
      </p>
    </main>
  );
}
