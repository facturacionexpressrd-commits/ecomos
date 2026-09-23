import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { apiRequiresSubscription, billingEnabled, userHasAccess } from "@/lib/billing";

// Refreshes the Supabase auth session cookie on every request, per @supabase/ssr's
// standard Next.js proxy recipe. Without this, sessions can silently expire mid-visit
// because server components can't write cookies themselves.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The one billing gate for every API route (the dashboard layout gates pages). Only signed-in
  // callers are checked: unauthenticated routes (webhooks, API-key jobs) do their own auth.
  if (user && billingEnabled() && apiRequiresSubscription(request.nextUrl.pathname) && !(await userHasAccess(user.id))) {
    return NextResponse.json(
      { error: "Your EcomOS subscription isn't active. Update billing to continue.", billingUrl: "/billing" },
      { status: 402 }
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/shopify/webhooks).*)"],
};
