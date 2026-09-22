/**
 * Guards AI-written prose about money: the model must cite every figure it
 * states against a fact this codebase computed, not invent or miscompute one.
 * An answer that fails is withheld by the caller, not silently kept — a wrong
 * number about a business recommendation is worse than no explanation.
 */
export type Fact = { id: string; label: string; value: number };
export type Citation = { factId: string; value: number };
export type ClaimedAnswer = { text: string; citations: Citation[] };
export type VerifyResult = { ok: true } | { ok: false; violations: string[] };

const NUMBER_PATTERN = /-?\$?\d[\d,]*(?:\.\d+)?%?/g;

function withinTolerance(stated: number, real: number, tolerance: number): boolean {
  if (real === 0) return Math.abs(stated) <= tolerance;
  return Math.abs(stated - real) / Math.abs(real) <= tolerance;
}

export function verify(answer: ClaimedAnswer, facts: Fact[], tolerance = 0.01): VerifyResult {
  const violations: string[] = [];
  const byId = new Map(facts.map((f) => [f.id, f]));

  for (const citation of answer.citations) {
    const fact = byId.get(citation.factId);
    if (!fact) {
      violations.push(`cites unknown fact id "${citation.factId}"`);
      continue;
    }
    if (!withinTolerance(citation.value, fact.value, tolerance)) {
      violations.push(`cites ${fact.label} as ${citation.value}, but the real value is ${fact.value}`);
    }
  }

  // Every number in the prose must be backed by a citation close to it — a
  // number with no citation is either invented or computed off the record.
  const statedNumbers = (answer.text.match(NUMBER_PATTERN) ?? [])
    .map((raw) => Number(raw.replace(/[$,%]/g, "")))
    .filter((n) => Number.isFinite(n));

  for (const stated of statedNumbers) {
    const isCited = answer.citations.some((c) => withinTolerance(stated, c.value, tolerance));
    if (!isCited) violations.push(`states "${stated}" with no matching citation`);
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

/** Flattens every finite number found anywhere in an arbitrary data object into facts. */
export function factsFromData(data: Record<string, unknown>, prefix = "data"): Fact[] {
  const facts: Fact[] = [];
  for (const [key, value] of Object.entries(data)) {
    const id = `${prefix}.${key}`;
    if (typeof value === "number" && Number.isFinite(value)) {
      facts.push({ id, label: key, value });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      facts.push(...factsFromData(value as Record<string, unknown>, id));
    }
  }
  return facts;
}
