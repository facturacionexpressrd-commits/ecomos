export interface OpportunityCriteria {
  minMargin: number; // 0-1 (e.g., 0.4 = 40% margin)
  maxCost: number; // USD
  maxShipping: number; // USD
  demandSignals?: string[]; // search volume, reviews, rating
  competitionLevel?: "low" | "medium" | "high";
}

export interface ScoredOpportunity {
  productId: string;
  productTitle: string;
  cost: number;
  estimatedRetailPrice: number;
  margin: number; // 0-1
  shippingCost: number;
  opportunityScore: number; // 0-100
  scoreBreakdown: {
    marginScore: number; // 0-100
    competitionScore: number; // 0-100
    demandScore: number; // 0-100
    costScore: number; // 0-100
  };
  confidence: number; // 0-1 based on data completeness
  reasoning: string[];
}

export class OpportunityScorer {
  /**
   * Calculates opportunity score based on:
   * - Margin potential (40-70% is ideal)
   * - Cost to entry (lower is better)
   * - Shipping cost impact
   * - Competition level
   * - Demand signals
   */
  scoreOpportunity(
    productId: string,
    productTitle: string,
    cost: number,
    estimatedRetailPrice: number,
    shippingCost: number,
    competitionLevel: "low" | "medium" | "high" = "medium",
    demandSignals?: string[]
  ): ScoredOpportunity {
    const margin = (estimatedRetailPrice - cost) / estimatedRetailPrice;
    const reasoning: string[] = [];

    // Margin score (0-100)
    // Ideal: 40-70% margin
    let marginScore = 0;
    if (margin < 0.2) {
      marginScore = margin * 100; // below 20%, scales down
      reasoning.push("Low margin potential");
    } else if (margin < 0.4) {
      marginScore = 20 + (margin - 0.2) * 100;
      reasoning.push("Below ideal 40% minimum");
    } else if (margin <= 0.7) {
      marginScore = 100; // ideal zone
      reasoning.push("Excellent margin in ideal range (40-70%)");
    } else {
      marginScore = Math.max(50, 100 - (margin - 0.7) * 100);
      reasoning.push("Above-average margin, watch for saturation");
    }

    // Cost score (0-100)
    // Penalize high costs, reward low costs
    let costScore = 0;
    if (cost < 5) {
      costScore = 100;
      reasoning.push("Very low cost of entry");
    } else if (cost < 20) {
      costScore = 100 - (cost - 5) * 2;
      reasoning.push("Low cost of entry");
    } else if (cost < 50) {
      costScore = 70 - (cost - 20) * 0.5;
      reasoning.push("Moderate cost");
    } else {
      costScore = Math.max(20, 50 - (cost - 50) * 0.2);
      reasoning.push("High cost may limit scalability");
    }

    // Competition score (0-100)
    let competitionScore = 0;
    if (competitionLevel === "low") {
      competitionScore = 100;
      reasoning.push("Low competition: high opportunity");
    } else if (competitionLevel === "medium") {
      competitionScore = 70;
      reasoning.push("Medium competition: requires differentiation");
    } else {
      competitionScore = 40;
      reasoning.push("High competition: needs strong positioning");
    }

    // Demand score (0-100)
    let demandScore = 50; // baseline
    if (demandSignals && demandSignals.length > 0) {
      if (demandSignals.includes("high_search_volume")) {
        demandScore += 20;
        reasoning.push("Strong search volume detected");
      }
      if (demandSignals.includes("high_reviews")) {
        demandScore += 15;
        reasoning.push("High review count indicates demand");
      }
      if (demandSignals.includes("high_rating")) {
        demandScore += 10;
        reasoning.push("High ratings suggest customer satisfaction");
      }
      if (demandSignals.includes("trending")) {
        demandScore += 15;
        reasoning.push("Trending product");
      }
    }
    demandScore = Math.min(100, demandScore);

    // Shipping impact (reduces final score)
    const shippingImpact = shippingCost / estimatedRetailPrice;
    let shippingPenalty = 0;
    if (shippingImpact > 0.3) {
      shippingPenalty = 30;
      reasoning.push(`High shipping cost impacts margin by ${(shippingImpact * 100).toFixed(0)}%`);
    } else if (shippingImpact > 0.15) {
      shippingPenalty = 15;
      reasoning.push(`Shipping cost is ${(shippingImpact * 100).toFixed(0)}% of retail price`);
    }

    // Composite score (weighted average)
    const opportunityScore =
      marginScore * 0.35 +
      costScore * 0.25 +
      competitionScore * 0.2 +
      demandScore * 0.2 -
      shippingPenalty;

    // Confidence score (0-1) based on data completeness
    let confidence = 0.7; // baseline
    if (demandSignals && demandSignals.length > 0) {
      confidence = Math.min(1, confidence + 0.15);
    }
    if (estimatedRetailPrice > 0 && cost > 0) {
      confidence = Math.min(1, confidence + 0.1);
    }

    return {
      productId,
      productTitle,
      cost,
      estimatedRetailPrice,
      margin,
      shippingCost,
      opportunityScore: Math.max(0, Math.min(100, opportunityScore)),
      scoreBreakdown: {
        marginScore: Math.max(0, Math.min(100, marginScore)),
        competitionScore,
        demandScore,
        costScore: Math.max(0, Math.min(100, costScore)),
      },
      confidence,
      reasoning,
    };
  }

  /**
   * Batch score multiple products and sort by opportunity
   */
  scoreMany(
    products: Array<{
      id: string;
      title: string;
      cost: number;
      estimatedRetailPrice: number;
      shippingCost: number;
      competitionLevel?: "low" | "medium" | "high";
      demandSignals?: string[];
    }>
  ): ScoredOpportunity[] {
    return products
      .map((p) =>
        this.scoreOpportunity(
          p.id,
          p.title,
          p.cost,
          p.estimatedRetailPrice,
          p.shippingCost,
          p.competitionLevel,
          p.demandSignals
        )
      )
      .sort((a, b) => b.opportunityScore - a.opportunityScore);
  }
}
