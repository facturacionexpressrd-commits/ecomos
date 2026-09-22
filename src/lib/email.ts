import { reportError } from "@/lib/alerts";

// Resend's shared dev sender — works with no domain setup, but Resend restricts it to your own
// verified account email as the recipient. Add a verified domain and set EMAIL_FROM to send to
// real users; until then this exists so the app degrades to "works for you" not "works for no one".
const DEFAULT_FROM = "EcomOS <onboarding@resend.dev>";

export type EmailResult = { sent: boolean; reason?: string };

/**
 * Sends one email via Resend's REST API. Never throws: a failed or unconfigured send is reported
 * and returned as `{ sent: false }` so a notification/invite flow can decide whether to still
 * record the in-app side of things rather than fail the whole request over an email hiccup.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY not set — would have sent "${input.subject}" to ${input.to}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await reportError(new Error(`Resend ${res.status}: ${body.slice(0, 300)}`), { where: "sendEmail" });
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    await reportError(err, { where: "sendEmail" });
    return { sent: false, reason: "network_error" };
  }
}

/** Shared visual frame every transactional email uses, so the app has one consistent look. */
export function emailLayout(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #e7b158; margin: 0 0 12px;">EcomOS</p>
      ${bodyHtml}
      <p style="color: #8a8a8a; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e5e5; padding-top: 16px;">
        You're receiving this because of activity on your EcomOS account.
      </p>
    </div>
  `;
}
