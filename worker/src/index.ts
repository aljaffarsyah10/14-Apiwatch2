import { Worker } from "bullmq";
import { defaultRedis } from "../../src/lib/queue/redis";
import {
  MONITORING_QUEUE_NAME,
  NOTIFICATION_QUEUE_NAME,
  MonitoringJobData,
  NotificationJobData,
} from "../../src/lib/queue/bullmq";
import { MonitoringService } from "../../src/lib/services/monitoring.service";
import { NotificationService } from "../../src/lib/services/notification.service";
import { reconcileAllSchedules } from "../../src/lib/queue/scheduler";
import db from "../../src/lib/db";

console.log("=========================================");
console.log("🚀 Starting APIWatch Monitoring Worker");
console.log("=========================================");

async function bootstrapWorker() {
  try {
    // 1. Startup reconciliation
    console.log("[Worker] Reconciling repeatable monitoring schedules...");
    const scheduled = await reconcileAllSchedules();
    console.log(`[Worker] Startup reconciliation complete. Schedulers active: ${scheduled}`);

    // 2. Monitoring Queue Worker
    const monitoringWorker = new Worker<MonitoringJobData>(
      MONITORING_QUEUE_NAME,
      async (job) => {
        const { endpointId, isManualCheck } = job.data;
        const result = await MonitoringService.executeCheck(endpointId, isManualCheck);
        if (result) {
          console.log(
            `[Check] Endpoint: ${endpointId} | Status: ${result.status} | Code: ${result.statusCode} | Latency: ${result.responseTimeMs}ms`
          );
        }
      },
      {
        connection: defaultRedis,
        concurrency: 10,
      }
    );

    monitoringWorker.on("failed", (job, err) => {
      console.error(`[Worker] Monitoring job ${job?.id} failed with error:`, err);
    });

    // 3. Notification Queue Worker
    const notificationWorker = new Worker<NotificationJobData>(
      NOTIFICATION_QUEUE_NAME,
      async (job) => {
        const success = await NotificationService.sendIncidentAlert(job.data);
        console.log(`[Notification] Job ${job.id} for ${job.data.recipientEmail} delivered: ${success}`);
      },
      {
        connection: defaultRedis,
        concurrency: 5,
      }
    );

    notificationWorker.on("failed", (job, err) => {
      console.error(`[Worker] Notification job ${job?.id} failed with error:`, err);
    });

    console.log("⚡ Monitoring worker is active and awaiting jobs.");

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down worker gracefully...`);
      await monitoringWorker.close();
      await notificationWorker.close();
      await defaultRedis.quit();
      await db.$disconnect();
      console.log("Worker shut down cleanly.");
      process.exit(0);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (error) {
    console.error("[Worker] Fatal error starting worker:", error);
    process.exit(1);
  }
}

bootstrapWorker();
