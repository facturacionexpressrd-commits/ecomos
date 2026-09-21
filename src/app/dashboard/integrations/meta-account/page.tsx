import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { MetaClient } from "@/lib/meta/client";
import { listAdAccountChoices, openPending } from "@/lib/meta/connect";

export default async function ChooseMetaAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pending = openPending((await cookies()).get("meta_pick")?.value, process.env.TOKEN_ENCRYPTION_KEY!);
  if (!pending) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-gray-700">
          This selection has expired. <Link className="underline" href="/dashboard/integrations">Start the Meta connection again.</Link>
        </p>
      </main>
    );
  }

  const client = new MetaClient({
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/auth/callback`,
  });
  const choices = await listAdAccountChoices(client, pending.token);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Choose an ad account</h1>
      <p className="mb-6 mt-1 text-sm text-gray-600">
        Your Meta login can reach several ad accounts. EcomOS will create and change campaigns, and set
        budgets, on the one you pick.
      </p>
      <ul className="space-y-3">
        {choices.map((c) => (
          <li key={c.adAccountId}>
            <form method="POST" action="/api/meta/auth/select" className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium">{c.adAccountName}</p>
                <p className="text-xs text-gray-500">
                  {c.businessName} · <code>{c.adAccountId}</code>
                </p>
              </div>
              <input type="hidden" name="adAccountId" value={c.adAccountId} />
              <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
                Use this account
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
