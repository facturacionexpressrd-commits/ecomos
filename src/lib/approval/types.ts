export type ApprovalActionType =
  | "supplier_add"
  | "budget_update"
  | "price_adjustment"
  | "creative_approval"
  | "campaign_launch"
  | "product_publish"
  | "order_fulfillment";

export interface ApprovalRecommendation {
  actionType: ApprovalActionType;
  title: string;
  description: string;
  data: Record<string, unknown>; // action-specific data
  priority: "low" | "medium" | "high" | "critical";
  confidenceScore: number; // 0-1
  reasoning: string; // why this is recommended
  estimatedImpact: {
    financialImpact?: number; // USD
    timelineImpact?: string; // e.g., "3 days faster"
    riskLevel: "low" | "medium" | "high";
  };
  executiveExplanation: string; // AI explanation for CEO/CFO
  requiredApprovals?: string[]; // who needs to approve
  autoApprovable: boolean; // can be auto-approved based on rules
}

export interface ApprovalAction {
  id: string;
  storeId: string;
  actionType: ApprovalActionType;
  title: string;
  description: string;
  data: Record<string, unknown>;
  priority: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  reasoning: string;
  executiveExplanation: string;
  status: "pending" | "approved" | "rejected" | "completed";
  approvedBy?: string; // user ID
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  createdBy: string;
}

export interface ExecutiveAssistantInput {
  actionType: ApprovalActionType;
  title: string;
  description: string;
  confidenceScore: number;
  reasoning: string;
  data: Record<string, unknown>;
  estimatedImpact: {
    financialImpact?: number;
    timelineImpact?: string;
    riskLevel: string;
  };
}
