import { prisma } from "@/lib/db";
import { Notification, NotificationType } from "./types";

export class NotificationService {
  static async notify(
    storeId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
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
            type,
            title,
            message,
            link,
            read: false,
          },
        });

        // Send email if enabled
        if (!prefs || prefs.emailNotifications) {
          this.sendEmail(userId, storeId, type, title, message, link).catch(
            (err) => console.error("Email send failed:", err)
          );
        }

        return notification;
      }

      return null;
    } catch (error) {
      console.error("Notification creation failed:", error);
      return null;
    }
  }

  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification | null> {
    try {
      return await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
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
      return await prisma.notification.findMany({
        where: { userId, storeId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
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
    storeId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ): Promise<void> {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      console.warn(`No email found for user ${userId}`);
      return;
    }

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log
    console.log(`Would send email to ${user.email}: ${title}`);

    // Example SendGrid integration:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: user.email,
    //   from: 'noreply@ecomos.app',
    //   subject: title,
    //   text: message,
    //   html: this.buildEmailTemplate(type, title, message, link),
    // });
  }

  private static buildEmailTemplate(
    type: NotificationType,
    title: string,
    message: string,
    link?: string
  ): string {
    const actionUrl = link ? `https://app.ecomos.app${link}` : "";

    return `
      <h2>${title}</h2>
      <p>${message}</p>
      ${
        actionUrl
          ? `<p><a href="${actionUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Details</a></p>`
          : ""
      }
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        You received this because you have notifications enabled for this type of activity.
        You can change your notification preferences in your account settings.
      </p>
    `;
  }
}
