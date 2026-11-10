import db from "../db";
import { notificationQueue } from "../queue/bullmq";
import { CheckStatus, Incident, IncidentStatus } from "@prisma/client";

export class IncidentService {
  /**
   * Process a failed check for an endpoint. Evaluates consecutive failure threshold
   * and opens an incident if the threshold is met and no open incident exists.
   */
  static async handleCheckFailure(
    endpointId: string,
    reason: string,
    statusCode: number | null
  ): Promise<Incident | null> {
    const endpoint = await db.endpoint.findUnique({
      where: { id: endpointId },
      include: {
        config: true,
        workspace: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!endpoint) return null;

    const threshold = 3;

    // Fetch the latest N checks
    const recentChecks = await db.monitoringCheck.findMany({
      where: { endpointId },
      orderBy: { checkedAt: "desc" },
      take: threshold,
      select: { status: true },
    });

    const isThresholdBreached =
      recentChecks.length >= threshold &&
      recentChecks.every((c) => c.status !== CheckStatus.SUCCESS);

    if (!isThresholdBreached) {
      return null;
    }

    // Check if an OPEN incident already exists
    const existingOpenIncident = await db.incident.findFirst({
      where: {
        endpointId,
        status: IncidentStatus.OPEN,
      },
    });

    if (existingOpenIncident) {
      return existingOpenIncident;
    }

    const formattedCause = statusCode
      ? `${reason || "Health check failed"} (Status: ${statusCode})`
      : (reason || "Continuous health check failures");

    // Create new OPEN incident
    const newIncident = await db.incident.create({
      data: {
        endpointId,
        status: IncidentStatus.OPEN,
        failureReason: formattedCause,
        startedAt: new Date(),
      },
    });

    // Update endpoint status to DOWN
    await db.endpoint.update({
      where: { id: endpointId },
      data: { status: "DOWN" },
    });

    // Enqueue notification if user/workspace has alert notifications enabled
    const recipientEmail = endpoint.workspace?.owner?.email;
    if (recipientEmail) {
      try {
        await notificationQueue.add("incident-open", {
          incidentId: newIncident.id,
          type: "INCIDENT_OPENED",
          recipientEmail,
          endpointName: endpoint.name,
          endpointUrl: endpoint.url,
          reason: newIncident.failureReason || "Health check failed",
          timestamp: newIncident.startedAt.toISOString(),
        });
      } catch (err) {
        console.warn("[IncidentService] Could not enqueue notification:", err);
      }
    }

    return newIncident;
  }

  /**
   * Process a successful check for an endpoint. If an OPEN incident exists, resolves it
   * and marks the endpoint as UP.
   */
  static async handleCheckRecovery(endpointId: string): Promise<Incident | null> {
    const endpoint = await db.endpoint.findUnique({
      where: { id: endpointId },
      include: {
        workspace: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!endpoint) return null;

    // Find any active open incident
    const openIncident = await db.incident.findFirst({
      where: {
        endpointId,
        status: IncidentStatus.OPEN,
      },
    });

    if (!openIncident) {
      // If endpoint was in PENDING or DOWN state without incident, set to UP
      if (endpoint.status !== "UP" && endpoint.status !== "PAUSED") {
        await db.endpoint.update({
          where: { id: endpointId },
          data: { status: "UP" },
        });
      }
      return null;
    }

    const resolvedIncident = await db.incident.update({
      where: { id: openIncident.id },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    // Update endpoint status back to UP
    await db.endpoint.update({
      where: { id: endpointId },
      data: { status: "UP" },
    });

    // Enqueue resolution notification
    const recipientEmail = endpoint.workspace?.owner?.email;
    if (recipientEmail) {
      try {
        await notificationQueue.add("incident-resolved", {
          incidentId: resolvedIncident.id,
          type: "INCIDENT_RESOLVED",
          recipientEmail,
          endpointName: endpoint.name,
          endpointUrl: endpoint.url,
          reason: "Endpoint is healthy and responding normally",
          timestamp: resolvedIncident.resolvedAt!.toISOString(),
        });
      } catch (err) {
        console.warn("[IncidentService] Could not enqueue resolution notification:", err);
      }
    }

    return resolvedIncident;
  }
}
