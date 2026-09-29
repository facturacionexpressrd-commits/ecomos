import { emailLayout } from "@/lib/email";

const btn =
  "background: #e7b158; color: #05080f; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;";

function absUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function welcomeEmail(input: { workspaceName: string }): { subject: string; html: string } {
  return {
    subject: `Welcome to EcomOS — ${input.workspaceName} is ready`,
    html: emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 8px;">Welcome to EcomOS</h2>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">
        Your workspace <strong>${input.workspaceName}</strong> is live. Connect your first Shopify store and
        EcomOS will start pulling orders, refunds and costs automatically — profit per variant appears the
        moment the first sync completes.
      </p>
      <p style="margin-top: 20px;">
        <a href="${absUrl("/dashboard")}" style="${btn}">Open dashboard</a>
      </p>
    `),
  };
}

export function syncFailureEmail(input: { storeName: string; reason: string }): { subject: string; html: string } {
  return {
    subject: `Sync failed for ${input.storeName}`,
    html: emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 8px;">Sync failed</h2>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">
        We couldn't sync <strong>${input.storeName}</strong>. Reason: ${input.reason}.
      </p>
      <p style="margin-top: 20px;">
        <a href="${absUrl("/dashboard")}" style="${btn}">Open dashboard</a>
      </p>
    `),
  };
}

export function lowStockEmail(input: { productName: string; variantName: string; qty: number }): { subject: string; html: string } {
  return {
    subject: `Low stock: ${input.productName}`,
    html: emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 8px;">Low stock alert</h2>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">
        <strong>${input.productName}</strong> — ${input.variantName} is down to <strong>${input.qty}</strong>
        units. Reorder from CJ or your supplier to avoid stockouts.
      </p>
    `),
  };
}

export function orderFulfilledEmail(input: { orderNumber: string; tracking?: string }): { subject: string; html: string } {
  return {
    subject: `Order ${input.orderNumber} fulfilled`,
    html: emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 8px;">Order fulfilled</h2>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">
        Order <strong>${input.orderNumber}</strong> has been marked fulfilled${input.tracking ? ` (tracking: ${input.tracking})` : ""}.
      </p>
    `),
  };
}
