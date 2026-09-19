import { describe, it, expect } from "vitest";
import {
  contributionProfit,
  contributionMargin,
  breakEvenCpa,
  maxSustainableCpa,
  breakEvenRoas,
  contributionRoas,
  adPaybackPeriodDays,
  variantContribution,
  variantContributionMargin,
} from "../src/lib/finance/formulas";

describe("Finance Formulas", () => {
  // ===== CONTRIBUTION PROFIT & MARGIN =====

  describe("contributionProfit", () => {
    it("calculates contribution with no refunds or fees", () => {
      const profit = contributionProfit(1000, 0, 0, 300);
      expect(profit).toBe(700); // 1000 - 300
    });

    it("subtracts refunds", () => {
      const profit = contributionProfit(1000, 100, 0, 300);
      expect(profit).toBe(600); // (1000 - 100) - 300
    });

    it("subtracts payment fees as percentage", () => {
      const profit = contributionProfit(1000, 0, 2.9, 300);
      // net revenue = 1000
      // payment fees = 1000 × 0.029 = 29
      // contribution = 1000 - 29 - 300 = 671
      expect(profit).toBeCloseTo(671, 0);
    });

    it("handles combined refunds and fees", () => {
      const profit = contributionProfit(1000, 100, 2.9, 300);
      // net revenue = 1000 - 100 = 900
      // payment fees = 900 × 0.029 = 26.1
      // contribution = 900 - 26.1 - 300 = 573.9
      expect(profit).toBeCloseTo(573.9, 1);
    });

    it("returns negative if COGS exceeds revenue", () => {
      const profit = contributionProfit(500, 0, 0, 600);
      expect(profit).toBe(-100);
    });
  });

  describe("contributionMargin", () => {
    it("calculates margin as percentage", () => {
      const margin = contributionMargin(1000, 0, 0, 300);
      expect(margin).toBe(70); // 700 / 1000 * 100
    });

    it("returns 0 if gross revenue is 0", () => {
      const margin = contributionMargin(0, 0, 0, 300);
      expect(margin).toBe(0);
    });

    it("returns negative margin if unprofitable", () => {
      const margin = contributionMargin(500, 0, 0, 600);
      expect(margin).toBe(-20); // -100 / 500 * 100
    });

    it("accounts for payment fees in margin", () => {
      const margin = contributionMargin(1000, 0, 2.9, 300);
      // profit = 671, margin = 67.1%
      expect(margin).toBeCloseTo(67.1, 1);
    });
  });

  // ===== BREAK-EVEN CPA =====

  describe("breakEvenCpa", () => {
    it("returns 0 if ad spend is 0", () => {
      const cpa = breakEvenCpa(1000, 50, 0);
      expect(cpa).toBe(0);
    });

    it("returns 0 if unique customers is 0", () => {
      const cpa = breakEvenCpa(1000, 0, 100);
      expect(cpa).toBe(0);
    });

    it("calculates CPA as ad spend per customer", () => {
      const cpa = breakEvenCpa(1000, 50, 250); // $250 spent on 50 customers
      expect(cpa).toBe(5); // $250 / 50 = $5 per customer
    });

    it("defaults ad spend to 0", () => {
      const cpa = breakEvenCpa(1000, 50);
      expect(cpa).toBe(0);
    });
  });

  // ===== MAX SUSTAINABLE CPA =====

  describe("maxSustainableCpa", () => {
    it("returns 0 if unique customers is 0", () => {
      const maxCpa = maxSustainableCpa(1000, 0);
      expect(maxCpa).toBe(0);
    });

    it("returns 0 if contribution profit is 0 or negative", () => {
      expect(maxSustainableCpa(0, 50)).toBe(0);
      expect(maxSustainableCpa(-100, 50)).toBe(0);
    });

    it("divides contribution profit by unique customers", () => {
      const maxCpa = maxSustainableCpa(500, 50); // $500 profit / 50 customers
      expect(maxCpa).toBe(10); // can spend up to $10 per customer
    });

    it("allows overspending if profitable", () => {
      const maxCpa = maxSustainableCpa(1000, 25); // $1000 / 25 = $40 per customer
      expect(maxCpa).toBe(40);
    });
  });

  // ===== BREAK-EVEN ROAS =====

  describe("breakEvenRoas", () => {
    it("returns 0 if ad spend is 0", () => {
      const roas = breakEvenRoas(5000, 0);
      expect(roas).toBe(0);
    });

    it("returns 0 if gross revenue is 0", () => {
      const roas = breakEvenRoas(0, 1000);
      expect(roas).toBe(0);
    });

    it("calculates revenue per dollar spent", () => {
      const roas = breakEvenRoas(5000, 1000); // $5000 revenue / $1000 spent
      expect(roas).toBe(5); // $5 back per $1 spent
    });

    it("returns < 1 if losing money on revenue", () => {
      const roas = breakEvenRoas(800, 1000);
      expect(roas).toBe(0.8); // spending more than you earn
    });

    it("defaults ad spend to 0", () => {
      const roas = breakEvenRoas(5000);
      expect(roas).toBe(0);
    });
  });

  // ===== CONTRIBUTION ROAS =====

  describe("contributionRoas", () => {
    it("returns 0 if ad spend is 0", () => {
      const roas = contributionRoas(500, 0);
      expect(roas).toBe(0);
    });

    it("calculates contribution profit per dollar spent", () => {
      const roas = contributionRoas(500, 250); // $500 profit / $250 spent
      expect(roas).toBe(2); // $2 contribution per $1 spent
    });

    it("returns < 1 if unprofitable on ads", () => {
      const roas = contributionRoas(100, 250); // $100 profit / $250 spent
      expect(roas).toBe(0.4); // spending more than you're making
    });

    it("returns 0 if no contribution profit", () => {
      const roas = contributionRoas(0, 250);
      expect(roas).toBe(0);
    });

    it("handles negative contribution profit", () => {
      const roas = contributionRoas(-100, 250);
      expect(roas).toBe(-0.4); // losing money on products too
    });

    it("defaults ad spend to 0", () => {
      const roas = contributionRoas(500);
      expect(roas).toBe(0);
    });
  });

  // ===== AD PAYBACK PERIOD =====

  describe("adPaybackPeriodDays", () => {
    it("returns 0 if ad spend is 0", () => {
      const payback = adPaybackPeriodDays(1000, 0, 30);
      expect(payback).toBe(0);
    });

    it("returns 0 if period is 0", () => {
      const payback = adPaybackPeriodDays(1000, 300, 0);
      expect(payback).toBe(0);
    });

    it("returns Infinity if daily profit is 0 or negative", () => {
      const payback = adPaybackPeriodDays(0, 300, 30);
      expect(payback).toBe(Infinity);

      const payback2 = adPaybackPeriodDays(-100, 300, 30);
      expect(payback2).toBe(Infinity);
    });

    it("calculates days needed to pay back ad spend", () => {
      const payback = adPaybackPeriodDays(3000, 300, 30);
      // daily profit = 3000 / 30 = 100
      // payback = 300 / 100 = 3 days
      expect(payback).toBe(3);
    });

    it("defaults ad spend to 0", () => {
      const payback = adPaybackPeriodDays(3000, undefined, 30);
      expect(payback).toBe(0);
    });

    it("handles fractional payback periods", () => {
      const payback = adPaybackPeriodDays(1000, 100, 10);
      // daily profit = 1000 / 10 = 100
      // payback = 100 / 100 = 1 day
      expect(payback).toBe(1);

      const payback2 = adPaybackPeriodDays(1000, 50, 10);
      // daily profit = 100
      // payback = 50 / 100 = 0.5 days
      expect(payback2).toBe(0.5);
    });
  });

  // ===== VARIANT-LEVEL ECONOMICS =====

  describe("variantContribution", () => {
    it("calculates contribution for a single variant", () => {
      const contrib = variantContribution(100, 30, 10, 2.9);
      // per unit: 100 - (100 * 0.029) - 30 = 100 - 2.9 - 30 = 67.1
      // total: 67.1 * 10 = 671
      expect(contrib).toBeCloseTo(671, 0);
    });

    it("returns 0 if quantity is 0", () => {
      const contrib = variantContribution(100, 30, 0, 2.9);
      expect(contrib).toBe(0);
    });

    it("handles high COGS", () => {
      const contrib = variantContribution(50, 40, 5, 2.9);
      // per unit: 50 - 1.45 - 40 = 8.55
      // total: 8.55 * 5 = 42.75
      expect(contrib).toBeCloseTo(42.75, 1);
    });

    it("returns negative if COGS > price", () => {
      const contrib = variantContribution(50, 60, 5, 0);
      // per unit: 50 - 60 = -10
      // total: -10 * 5 = -50
      expect(contrib).toBe(-50);
    });
  });

  describe("variantContributionMargin", () => {
    it("calculates margin as percentage of revenue", () => {
      const margin = variantContributionMargin(100, 30, 10, 0);
      // contribution = (100 - 30) * 10 = 700
      // revenue = 100 * 10 = 1000
      // margin = 700 / 1000 * 100 = 70%
      expect(margin).toBe(70);
    });

    it("returns 0 if revenue is 0", () => {
      const margin = variantContributionMargin(100, 30, 0, 0);
      expect(margin).toBe(0);
    });

    it("accounts for payment fees", () => {
      const margin = variantContributionMargin(100, 30, 10, 2.9);
      // per unit: 100 - 2.9 - 30 = 67.1
      // total contribution: 671
      // revenue: 1000
      // margin: 67.1%
      expect(margin).toBeCloseTo(67.1, 1);
    });

    it("returns negative margin if unprofitable", () => {
      const margin = variantContributionMargin(50, 60, 10, 0);
      // contribution = (50 - 60) * 10 = -100
      // revenue = 50 * 10 = 500
      // margin = -100 / 500 * 100 = -20%
      expect(margin).toBe(-20);
    });
  });
});
