import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAlertEmail(
  to: string,
  alerts: any[],
  summary?: any
): Promise<void> {
  const alertHtml = alerts
    .map(
      (alert) => `
    <div style="padding: 12px; margin: 8px 0; border-left: 4px solid #ef4444; background: #fef2f2;">
      <strong>${alert.message}</strong>
      ${alert.value ? `<br><small style="color: #666;">Value: ${alert.value.toFixed(2)}</small>` : ""}
    </div>
  `
    )
    .join("");

  const summaryHtml = summary
    ? `
    <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0;">Daily Summary — ${summary.date}</h3>
      <p style="margin: 4px 0;">💰 Revenue: $${summary.revenue}</p>
      <p style="margin: 4px 0;">📈 Profit: $${summary.profit} (${summary.margin}%)</p>
      <p style="margin: 4px 0;">📦 Orders: ${summary.orders}</p>
    </div>
  `
    : "";

  try {
    await resend.emails.send({
      from: "alerts@ecomos.app",
      to,
      subject: `🚨 EcomOS Performance Alerts — ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="margin: 0 0 20px 0;">Performance Alerts</h2>
          ${alertHtml}
          ${summaryHtml}
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            View more details: <a href="${process.env.NEXT_PUBLIC_URL}/dashboard/analytics">Go to Analytics</a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send alert email:", error);
    throw error;
  }
}

export async function sendTestEmail(to: string): Promise<void> {
  await resend.emails.send({
    from: "alerts@ecomos.app",
    to,
    subject: "Test Email — EcomOS Alerts",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>✅ Alert System Active</h2>
        <p>Your email alerts are configured and working. You'll receive notifications for:</p>
        <ul>
          <li>High-performing campaigns (ROAS > 3.0x)</li>
          <li>Low-performing campaigns (ROAS < 1.5x)</li>
          <li>Budget overruns (> 110% of daily budget)</li>
          <li>Daily performance summaries</li>
        </ul>
      </div>
    `,
  });
}
