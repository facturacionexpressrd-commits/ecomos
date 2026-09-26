import { describe, it, expect } from "vitest";
import { setupSteps } from "../src/lib/setup";

const base = {
  storeId: "s1",
  productCount: 0,
  variantCount: 0,
  variantsMissingCost: 0,
  metaConnected: false,
  billingEnabled: false,
  subscribed: false,
};
const doneKeys = (i: typeof base) => setupSteps(i).filter((s) => s.done).map((s) => s.key);

describe("setupSteps", () => {
  it("a fresh store has only the connect step done", () => {
    expect(doneKeys(base)).toEqual(["store"]);
  });

  it("costs count as done only when every variant has one", () => {
    expect(doneKeys({ ...base, productCount: 1, variantCount: 3, variantsMissingCost: 1 })).not.toContain("costs");
    expect(doneKeys({ ...base, productCount: 1, variantCount: 3, variantsMissingCost: 0 })).toContain("costs");
  });

  it("billing step appears only when billing is enabled", () => {
    expect(setupSteps(base).some((s) => s.key === "billing")).toBe(false);
    expect(setupSteps({ ...base, billingEnabled: true }).some((s) => s.key === "billing")).toBe(true);
  });

  it("links keep the selected store", () => {
    expect(setupSteps(base).find((s) => s.key === "meta")!.href).toBe("/dashboard/integrations?store=s1");
  });
});
