import { Queue } from "bullmq";
import { defaultRedis } from "./redis";

export const MONITORING_QUEUE_NAME = "apiwatch-monitoring";
export const NOTIFICATION_QUEUE_NAME = "apiwatch-notifications";

export interface MonitoringJobData {
  endpointId: string;
  isManualCheck?: boolean;
}

export interface NotificationJobData {
  incidentId: string;
  type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED";
  recipientEmail: string;
  endpointName: string;
  endpointUrl: string;
  reason: string;
  timestamp: string;
}

// Queue singletons
export const monitoringQueue = new Queue<MonitoringJobData>(MONITORING_QUEUE_NAME, {
  connection: defaultRedis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 1, // Monitoring checks should not blindly auto-retry immediately inside queue; worker records failure
  },
});

export const notificationQueue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
  connection: defaultRedis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});
