import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/billing";
import { reportError } from "@/lib/alerts";

// Subscription events carry the full current state, so handling them is idempotent and
// order-insensitive enough: a replayed or late event just rewrites the same fields.
const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    // Signature is computed over the raw body, so it must be read as text, never parsed first.
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await reportError(error, { where: "POST /api/billing/webhook", type: event.type });
    // Non-2xx makes Stripe retry, which is what we want for a transient DB failure.
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
