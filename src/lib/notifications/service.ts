import { prisma } from "@/lib/db";
import { Notification, NotificationType } from "./types";
import { emailLayout, sendEmail } from "@/lib/email";

export class NotificationService {
  static async notify(
    storeId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<Notification | null> {
    try {
      // Check user preferences
      const prefs = await prisma.notificationPreferences.findFirst({
        where: { userId, storeId },
      });

      // Skip if user has this notification type disabled
      if (prefs && !prefs[type as keyof typeof prefs]) {
        return null;
      }

      // Create in-app notification if enabled (default: true)
      if (!prefs || prefs.inAppNotifications) {
        const notification = await prisma.notification.create({
          data: {
            storeId,
            userId,
            type: type as string,
            title,
            message,
            read: false,
          },
        });

        // Send email if enabled
        if (!prefs || prefs.emailNotifications) {
          this.sendEmail(userId, type, title, message).catch(
            (err) => console.error("Email send failed:", err)
          );
        }

        return notification as Notification;
      }

      return null;
    } catch (error) {
      console.error("Notification creation failed:", error);
      return null;
    }
  }

  static async markAsRead(
    notificationId: string
  ): Promise<Notification | null> {
    try {
      return (await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      })) as Notification;
    } catch (error) {
      console.error("Mark as read failed:", error);
      return null;
    }
  }

  static async getUserNotifications(
    userId: string,
    storeId: string,
    limit: number = 20
  ): Promise<Notification[]> {
    try {
      return (await prisma.notification.findMany({
        where: { userId, storeId },
        orderBy: { createdAt: "desc" },
        take: limit,
      })) as Notification[];
    } catch (error) {
      console.error("Get notifications failed:", error);
      return [];
    }
  }

  static async getUnreadCount(
    userId: string,
    storeId: string
  ): Promise<number> {
    try {
      return await prisma.notification.count({
        where: {
          userId,
          storeId,
          read: false,
        },
      });
    } catch (error) {
      console.error("Get unread count failed:", error);
      return 0;
    }
  }

  private static async sendEmail(
    userId: string,
    type: NotificationType,
    title: string,
    message: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) {
      console.warn(`No email found for user ${userId}`);
      return;
    }

    await sendEmail({
      to: user.email,
      subject: title,
      html: this.buildEmailTemplate(type, title, message),
    });
  }

  private static buildEmailTemplate(type: NotificationType, title: string, message: string): string {
    return emailLayout(`
      <h2 style="font-size: 18px; margin: 0 0 8px;">${title}</h2>
      <p style="font-size: 14px; color: #333; line-height: 1.5;">${message}</p>
      <p style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 16px;">${type}</p>
    `);
  }
}
