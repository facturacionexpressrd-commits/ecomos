export type NotificationType =
  | "approval_pending"
  | "approval_approved"
  | "approval_rejected"
  | "campaign_launched"
  | "campaign_paused"
  | "opportunity_found"
  | "creative_generated"
  | "product_published"
  | "order_routed"
  | "sync_completed"
  | "error_alert";

export interface Notification {
  id: string;
  storeId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string; // deep link to relevant page
  read: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  storeId: string;
  // Toggle each type on/off
  approval_pending: boolean;
  approval_approved: boolean;
  approval_rejected: boolean;
  campaign_launched: boolean;
  campaign_paused: boolean;
  opportunity_found: boolean;
  creative_generated: boolean;
  product_published: boolean;
  order_routed: boolean;
  sync_completed: boolean;
  error_alert: boolean;
  // Delivery channels
  emailNotifications: boolean;
  inAppNotifications: boolean;
  // Frequency
  digestFrequency: "immediate" | "daily" | "weekly"; // batched emails
}

export interface EmailNotification {
  to: string;
  subject: string;
  templateType: NotificationType;
  data: Record<string, unknown>;
}
