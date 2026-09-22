import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { sendOrderToCj, CjUserError } from "@/lib/suppliers/cj-service";
import { CjError } from "@/lib/suppliers/cj";
import { reportError } from "@/lib/alerts";

/** Creates the order at CJ, unpaid; the merchant pays it in their CJ account. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storeId, orderId } = (await req.json()) as { storeId?: string; orderId?: string };
  if (!storeId || !orderId) return NextResponse.json({ error: "storeId and orderId are required" }, { status: 400 });

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.storeSync)) {
    return NextResponse.json({ error: "No access to this store" }, { status: 403 });
  }

  try {
    const result = await sendOrderToCj({ storeId, orderId, userId: user.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof CjUserError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof CjError) return NextResponse.json({ error: `CJ: ${err.message}` }, { status: 502 });
    await reportError(err, { where: "POST /api/suppliers/cj/orders" });
    return NextResponse.json({ error: "Couldn't reach CJ. Please try again." }, { status: 502 });
  }
}
