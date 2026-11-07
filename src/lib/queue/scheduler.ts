import { monitoringQueue } from "./bullmq";
import db from "../db";

const REPEATABLE_JOB_PREFIX = "monitoring-schedule";

export function getSchedulerJobId(endpointId: string): string {
  return `${REPEATABLE_JOB_PREFIX}-${endpointId}`;
}

/**
 * Register or update a repeatable check job for an endpoint.
 */
export async function scheduleEndpointCheck(
  endpointId: string,
  intervalSeconds: number
): Promise<void> {
  const intervalMs = Math.max(intervalSeconds, 10) * 1000;
  const schedulerId = getSchedulerJobId(endpointId);

  try {
    // First remove any existing scheduled job for this endpoint to prevent duplicates
    await removeEndpointSchedule(endpointId);

    // Upsert repeatable job
    await monitoringQueue.upsertJobScheduler(
      schedulerId,
      { every: intervalMs },
      {
        name: "execute-check",
        data: { endpointId, isManualCheck: false },
      }
    );
  } catch (error) {
    // If Redis is not connected, log warning without crashing application
    console.warn(`[Scheduler] Could not schedule check for ${endpointId}:`, error);
  }
}

/**
 * Remove repeatable check job for an endpoint.
 */
export async function removeEndpointSchedule(endpointId: string): Promise<void> {
  const schedulerId = getSchedulerJobId(endpointId);
  try {
    await monitoringQueue.removeJobScheduler(schedulerId);
  } catch (error) {
    console.warn(`[Scheduler] Could not remove schedule for ${endpointId}:`, error);
  }
}

/**
 * Trigger an immediate one-off check for an endpoint.
 */
export async function triggerImmediateCheck(endpointId: string): Promise<string | undefined> {
  try {
    const job = await monitoringQueue.add(
      "manual-check",
      { endpointId, isManualCheck: true },
      { jobId: `manual:${endpointId}:${Date.now()}` }
    );
    return job.id;
  } catch (error) {
    console.warn(`[Scheduler] Could not enqueue immediate check for ${endpointId}:`, error);
    return undefined;
  }
}

/**
 * Startup reconciliation: queries all active (UP, DOWN, PENDING) endpoints from PostgreSQL
 * and ensures their repeat schedulers exist in Redis.
 */
export async function reconcileAllSchedules(): Promise<number> {
  try {
    const activeEndpoints = await db.endpoint.findMany({
      where: {
        status: { in: ["UP", "DOWN", "PENDING"] },
      },
    });

    let scheduledCount = 0;
    for (const endpoint of activeEndpoints) {
      const interval = endpoint.intervalSeconds || 60;
      await scheduleEndpointCheck(endpoint.id, interval);
      scheduledCount++;
    }

    return scheduledCount;
  } catch (error) {
    console.warn("[Scheduler] Startup reconciliation error:", error);
    return 0;
  }
}
