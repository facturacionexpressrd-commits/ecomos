export type AlertType =
  | "high_roas"
  | "low_roas"
  | "budget_exceeded"
  | "no_impressions"
  | "daily_summary";

export interface AlertThreshold {
  type: AlertType;
  enabled: boolean;
  threshold?: number;
  schedule?: string;
}

export const DEFAULT_THRESHOLDS: Record<AlertType, AlertThreshold> = {
  high_roas: { type: "high_roas", enabled: true, threshold: 3.0 },
  low_roas: { type: "low_roas", enabled: true, threshold: 1.5 },
  budget_exceeded: { type: "budget_exceeded", enabled: true, threshold: 110 },
  no_impressions: { type: "no_impressions", enabled: true },
  daily_summary: { type: "daily_summary", enabled: true, schedule: "0 9 * * *" },
};

export interface Alert {
  id: string;
  storeId: string;
  type: AlertType;
  campaignId?: string;
  campaignName?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  message: string;
  createdAt: Date;
  resolved: boolean;
}

export interface AlertSettings {
  storeId: string;
  email: string;
  thresholds: Record<AlertType, AlertThreshold>;
}
