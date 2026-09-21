import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaClient } from "@/lib/meta/client";
import { connectAdAccount, listAdAccountChoices, openPending } from "@/lib/meta/connect";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";

// The pending-selection cookie is SameSite=Lax, so a cross-site form post never carries it.
export async function POST(req: NextRequest) {
  const done = (query: string) => {
    const res = NextResponse.redirect(new URL(`/dashboard?${query}`, req.url), 303);
    res.cookies.delete("meta_pick");
    return res;
  };

  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY not set");

  const pending = openPending(req.cookies.get("meta_pick")?.value, key);
  if (!pending) return done("meta_auth_error=selection_expired");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, pending.storeId, CAPABILITIES.campaignsManage)) {
    return done("meta_auth_error=no_store_access");
  }

  const adAccountId = String((await req.formData()).get("adAccountId") ?? "");
  const client = new MetaClient({
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/auth/callback`,
  });

  try {
    // Only accept an account Meta says this token can actually reach; the form is untrusted.
    const choice = (await listAdAccountChoices(client, pending.token)).find((c) => c.adAccountId === adAccountId);
    if (!choice) return done("meta_auth_error=invalid_selection");

    const account = await connectAdAccount({
      storeId: pending.storeId,
      userId: user.id,
      accessToken: pending.token,
      businessId: choice.businessId,
      adAccountId: choice.adAccountId,
    });
    return done(`meta_auth_success=true&meta_account_id=${account.id}`);
  } catch (error) {
    await reportError(error, { where: "Error selecting Meta ad account" });
    return done("meta_auth_error=callback_failed");
  }
}
