import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { linkVariant, unlinkVariant, CjUserError } from "@/lib/suppliers/cj-service";
import { CjError } from "@/lib/suppliers/cj";
import { reportError } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storeId, variantId, ref, unlink } = (await req.json()) as {
    storeId?: string;
    variantId?: string;
    ref?: string;
    unlink?: boolean;
  };
  if (!storeId || !variantId) return NextResponse.json({ error: "storeId and variantId are required" }, { status: 400 });

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.productsManage)) {
    return NextResponse.json({ error: "No access to this store" }, { status: 403 });
  }

  try {
    if (unlink) {
      await unlinkVariant(storeId, variantId);
      return NextResponse.json({ ok: true });
    }
    if (!ref?.trim()) return NextResponse.json({ error: "Enter a CJ variant SKU or ID" }, { status: 400 });
    const link = await linkVariant({ storeId, variantId, ref, userId: user.id });
    return NextResponse.json({ ok: true, link });
  } catch (err) {
    if (err instanceof CjUserError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof CjError) return NextResponse.json({ error: `CJ: ${err.message}` }, { status: 502 });
    await reportError(err, { where: "POST /api/suppliers/cj/link" });
    return NextResponse.json({ error: "Couldn't reach CJ. Please try again." }, { status: 502 });
  }
}
