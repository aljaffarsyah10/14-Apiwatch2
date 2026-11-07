import nodemailer from "nodemailer";
import db from "../db";
import { NotificationDeliveryStatus } from "@prisma/client";

export interface SendNotificationOptions {
  incidentId: string;
  type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED";
  recipientEmail: string;
  endpointName: string;
  endpointUrl: string;
  reason: string;
  timestamp: string;
}

export class NotificationService {
  private static getTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    // Fallback: simulated json transport
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  /**
   * Dispatch an incident alert email and persist the delivery record in PostgreSQL.
   */
  static async sendIncidentAlert(options: SendNotificationOptions): Promise<boolean> {
    const { incidentId, type, recipientEmail, endpointName, endpointUrl, reason, timestamp } = options;

    const isDownAlert = type === "INCIDENT_OPENED";
    const subject = isDownAlert
      ? `🚨 [ALERT DOWN] ${endpointName} is failing health checks`
      : `✅ [RESOLVED] ${endpointName} is back online`;

    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: ${isDownAlert ? "#ef4444" : "#10b981"};">${subject}</h2>
        <p><strong>Endpoint:</strong> ${endpointName}</p>
        <p><strong>URL:</strong> <code>${endpointUrl}</code></p>
        <p><strong>Status:</strong> ${isDownAlert ? "DOWN" : "RECOVERED / UP"}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Timestamp:</strong> ${timestamp}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated monitoring alert from APIWatch.</p>
      </div>
    `;

    // Persist pending record in DB
    const notification = await db.notification.create({
      data: {
        incidentId,
        recipient: recipientEmail,
        type: "EMAIL",
        deliveryStatus: NotificationDeliveryStatus.PENDING,
      },
    });

    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"APIWatch Alerts" <alerts@apiwatch.io>',
        to: recipientEmail,
        subject,
        html: bodyHtml,
      });

      // Update to SENT
      await db.notification.update({
        where: { id: notification.id },
        data: {
          deliveryStatus: NotificationDeliveryStatus.SENT,
          sentAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[NotificationService] Failed to send email to ${recipientEmail}:`, errorMsg);

      // Update to FAILED
      await db.notification.update({
        where: { id: notification.id },
        data: {
          deliveryStatus: NotificationDeliveryStatus.FAILED,
        },
      });

      return false;
    }
  }
}
