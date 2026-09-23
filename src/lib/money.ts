/**
 * Money is an integer of minor units plus its ISO 4217 code, always together.
 * Prevents the two bug classes this codebase has already hit: dollars/cents
 * mixups (Meta budgets) and adding amounts across currencies.
 */
export type Money = { amount: bigint; currency: string };

/** Currencies whose minor unit is not 1/100. Extend as stores are added. */
const EXPONENTS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  CLP: 0,
  ISK: 0,
  VND: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  TND: 3,
};

export function exponent(currency: string): number {
  return EXPONENTS[currency.toUpperCase()] ?? 2;
}

export function money(amount: bigint | number, currency: string): Money {
  if (typeof amount === "number" && !Number.isInteger(amount)) {
    throw new Error("money() takes minor units; use parseDecimal for a decimal string");
  }
  return { amount: BigInt(amount), currency: currency.toUpperCase() };
}

/** Parses a decimal string ("41.29") into minor units, no floats. */
export function parseDecimal(value: string, currency: string): Money {
  const exp = exponent(currency);
  const trimmed = value.trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) throw new Error(`Not a decimal amount: ${value}`);
  const [, sign, whole, fraction = ""] = match;
  const padded = (fraction + "0".repeat(exp)).slice(0, exp);
  const rest = fraction.slice(exp);
  if (/[1-9]/.test(rest)) {
    throw new Error(`${value} has more precision than ${currency} allows`);
  }
  const minor = BigInt(whole + padded) * BigInt(sign === "-" ? -1 : 1);
  return { amount: minor, currency: currency.toUpperCase() };
}

/** Prisma Decimal fields are always major units (dollars); this is the one boundary. */
export function fromMajorUnits(value: number | string, currency: string): Money {
  return parseDecimal(String(value), currency);
}

export function toMajorUnits(m: Money): number {
  const exp = exponent(m.currency);
  return Number(m.amount) / 10 ** exp;
}

function assertSame(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSame(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSame(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

/**
 * Sums amounts per currency. Returns a map, never a single total — a portfolio
 * figure across currencies needs a named FX source and is not this function's job.
 */
export function sumByCurrency(amounts: Money[]): Map<string, Money> {
  const totals = new Map<string, Money>();
  for (const m of amounts) {
    const existing = totals.get(m.currency);
    totals.set(m.currency, existing ? add(existing, m) : m);
  }
  return totals;
}

export function format(m: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: m.currency }).format(
    toMajorUnits(m),
  );
}
