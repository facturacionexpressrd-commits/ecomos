import { describe, it, expect } from "vitest";
import { money, parseDecimal, fromMajorUnits, toMajorUnits, add, subtract, sumByCurrency, format } from "../src/lib/money";

describe("parseDecimal", () => {
  it("parses a plain decimal into minor units", () => {
    expect(parseDecimal("41.29", "USD")).toEqual({ amount: BigInt(4129), currency: "USD" });
  });
  it("parses a zero-exponent currency without a decimal point", () => {
    expect(parseDecimal("500", "JPY")).toEqual({ amount: BigInt(500), currency: "JPY" });
  });
  it("rejects more precision than the currency allows", () => {
    expect(() => parseDecimal("1.005", "USD")).toThrow(/more precision/);
  });
  it("rejects a non-decimal string", () => {
    expect(() => parseDecimal("abc", "USD")).toThrow(/Not a decimal amount/);
  });
  it("handles negative amounts", () => {
    expect(parseDecimal("-12.50", "USD")).toEqual({ amount: BigInt(-1250), currency: "USD" });
  });
});

describe("money", () => {
  it("rejects a fractional major-unit number", () => {
    expect(() => money(4.5, "USD")).toThrow(/minor units/);
  });
});

describe("major/minor round-trip", () => {
  it("round-trips a dollar amount", () => {
    expect(toMajorUnits(fromMajorUnits(19.99, "USD"))).toBeCloseTo(19.99);
  });
  it("mirrors the Meta ad-set cents to campaign dollars conversion", () => {
    expect(toMajorUnits(money(150000, "USD"))).toBe(1500);
  });
});

describe("add/subtract", () => {
  it("adds same-currency amounts", () => {
    expect(add(money(100, "USD"), money(50, "USD"))).toEqual({ amount: BigInt(150), currency: "USD" });
  });
  it("refuses to add across currencies", () => {
    expect(() => add(money(100, "USD"), money(100, "EUR"))).toThrow(/Cannot combine/);
  });
  it("subtracts same-currency amounts", () => {
    expect(subtract(money(100, "USD"), money(30, "USD"))).toEqual({ amount: BigInt(70), currency: "USD" });
  });
});

describe("sumByCurrency", () => {
  it("keeps totals separate per currency", () => {
    const totals = sumByCurrency([money(100, "USD"), money(200, "USD"), money(50, "EUR")]);
    expect(totals.get("USD")).toEqual({ amount: BigInt(300), currency: "USD" });
    expect(totals.get("EUR")).toEqual({ amount: BigInt(50), currency: "EUR" });
  });
});

describe("format", () => {
  it("formats as a currency string", () => {
    expect(format(money(150000, "USD"))).toBe("$1,500.00");
  });
});
