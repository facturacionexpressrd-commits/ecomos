import { describe, it, expect, vi, afterEach } from "vitest";
import { sendEmail } from "../src/lib/email";

const originalFetch = global.fetch;
const originalKey = process.env.RESEND_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  process.env.RESEND_API_KEY = originalKey;
});

describe("sendEmail", () => {
  it("never throws and reports not_configured when no API key is set", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({ to: "a@example.com", subject: "hi", html: "<p>hi</p>" });
    expect(result).toEqual({ sent: false, reason: "not_configured" });
  });

  it("reports sent:true on a 200 from Resend", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => "" }) as typeof fetch;
    const result = await sendEmail({ to: "a@example.com", subject: "hi", html: "<p>hi</p>" });
    expect(result).toEqual({ sent: true });
  });

  it("degrades to sent:false, never throws, on a non-2xx from Resend", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "invalid from" }) as typeof fetch;
    const result = await sendEmail({ to: "a@example.com", subject: "hi", html: "<p>hi</p>" });
    expect(result).toEqual({ sent: false, reason: "http_422" });
  });

  it("degrades to sent:false, never throws, on a network failure", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as typeof fetch;
    const result = await sendEmail({ to: "a@example.com", subject: "hi", html: "<p>hi</p>" });
    expect(result).toEqual({ sent: false, reason: "network_error" });
  });
});
