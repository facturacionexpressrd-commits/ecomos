import { describe, it, expect } from "vitest";
import { cleanWorkspaceName } from "../src/lib/onboarding";
import { safePath } from "../src/lib/redirect";

describe("cleanWorkspaceName", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanWorkspaceName("  Acme   Store ")).toBe("Acme Store");
  });
  it("rejects empty, one-character, over-long and non-string input", () => {
    expect(cleanWorkspaceName("   ")).toBeNull();
    expect(cleanWorkspaceName("A")).toBeNull();
    expect(cleanWorkspaceName("x".repeat(81))).toBeNull();
    expect(cleanWorkspaceName("x".repeat(80))).toBe("x".repeat(80));
    expect(cleanWorkspaceName(null)).toBeNull();
    expect(cleanWorkspaceName(42)).toBeNull();
  });
});

describe("safePath", () => {
  it("keeps same-site paths, including an invite link with a token", () => {
    expect(safePath("/dashboard/orders")).toBe("/dashboard/orders");
    expect(safePath("/invite/abc-123_XYZ")).toBe("/invite/abc-123_XYZ");
  });
  it("falls back for anything that could leave the site", () => {
    const backslash = String.fromCharCode(92);
    for (const bad of ["https://evil.com", "//evil.com", `/${backslash}evil.com`, "evil.com", "javascript:alert(1)", "", null, undefined]) {
      expect(safePath(bad)).toBe("/dashboard");
    }
  });
  it("honours a custom fallback", () => {
    expect(safePath("//x", "/login")).toBe("/login");
  });
});
