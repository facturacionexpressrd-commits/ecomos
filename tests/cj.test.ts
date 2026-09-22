import { describe, it, expect, vi, afterEach } from "vitest";
import { cheapest, pickOrigin, mapOrderStatus, findVariant, CjError, getAccessToken } from "../src/lib/suppliers/cj";

afterEach(() => vi.unstubAllGlobals());

const envelope = (data: unknown, ok = true) =>
  ({ ok: true, status: 200, json: async () => ({ code: ok ? 200 : 1600100, result: ok, message: ok ? "Success" : "Param error", data }) }) as Response;

describe("cheapest", () => {
  it("picks the lowest price, breaking ties by the faster upper bound", () => {
    expect(
      cheapest([
        { method: "Slow", price: 3, days: "15-30" },
        { method: "Fast", price: 3, days: "5-8" },
        { method: "Pricey", price: 9, days: "2-3" },
      ])?.method
    ).toBe("Fast");
  });
  it("returns null when CJ has no route", () => {
    expect(cheapest([])).toBeNull();
  });
});

describe("pickOrigin", () => {
  it("ships from the destination country when that warehouse has stock", () => {
    expect(pickOrigin([{ countryCode: "CN", qty: 900 }, { countryCode: "US", qty: 4 }], "US")).toBe("US");
  });
  it("otherwise uses the warehouse with the most stock", () => {
    expect(pickOrigin([{ countryCode: "CN", qty: 900 }, { countryCode: "US", qty: 0 }], "US")).toBe("CN");
    expect(pickOrigin([{ countryCode: "TH", qty: 50 }, { countryCode: "CN", qty: 10 }], "DE")).toBe("TH");
  });
  it("defaults to CN when nothing is in stock anywhere", () => {
    expect(pickOrigin([], "US")).toBe("CN");
  });
});

describe("mapOrderStatus", () => {
  it("maps CJ's statuses onto EcomOS's", () => {
    expect(mapOrderStatus("UNPAID")).toBe("awaiting_payment");
    expect(mapOrderStatus("CREATED")).toBe("awaiting_payment");
    expect(mapOrderStatus("UNSHIPPED")).toBe("processing");
    expect(mapOrderStatus("SHIPPED")).toBe("shipped");
    expect(mapOrderStatus("DELIVERED")).toBe("delivered");
    expect(mapOrderStatus("CANCELLED")).toBe("cancelled");
  });
});

describe("CJ envelope handling", () => {
  it("treats result=false as a failure even on HTTP 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => envelope(null, false)));
    await expect(getAccessToken("bad")).rejects.toBeInstanceOf(CjError);
  });

  it("findVariant falls back from vid lookup to an exact variant-SKU match", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("queryByVid")
        ? envelope(null)
        : envelope({
            variants: [
              { vid: "v-1", variantSku: "CJ-RED-S", variantSellPrice: 3.1 },
              { vid: "v-2", variantSku: "CJ-RED-M", variantSellPrice: "3.40", variantNameEn: "Red / M" },
            ],
          })
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await findVariant("t", "cj-red-m")).toEqual({ vid: "v-2", sku: "CJ-RED-M", name: "Red / M", price: 3.4 });
  });

  it("findVariant reports a bad token as an error, not as 'not found'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ code: 1600001, result: false, message: "Invalid API key or access token", data: null }) }) as Response)
    );
    await expect(findVariant("expired", "CJ-RED-M")).rejects.toBeInstanceOf(CjError);
  });

  it("findVariant returns null when CJ doesn't know the reference", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => envelope(null, false)));
    expect(await findVariant("t", "nope")).toBeNull();
  });
});
