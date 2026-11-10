import db from "../db";
import { EndpointStatus, HttpMethod, Prisma } from "@prisma/client";
import { scheduleEndpointCheck, removeEndpointSchedule, triggerImmediateCheck } from "../queue/scheduler";
import { validateSafeUrl } from "../monitoring/ssrf-guard";
import { encryptCredential } from "../crypto";
import { UsageLimitsService } from "./usage-limits.service";

export interface CreateEndpointInput {
  name: string;
  url: string;
  method: HttpMethod;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatusCodes?: string;
  requestHeaders?: Array<{ key: string; value: string }>;
  requestBody?: string | null;
  expectedBodyContains?: string | null;
  expectedBodyNotContains?: string | null;
  followRedirects?: boolean;
}

export interface UpdateEndpointInput extends Partial<CreateEndpointInput> {
  status?: EndpointStatus;
}

export class EndpointService {
  /**
   * List endpoints belonging to a workspace with optional search query and status filter.
   */
  static async listEndpoints(
    workspaceId: string,
    options?: {
      search?: string;
      status?: EndpointStatus | "ALL";
    }
  ) {
    const where: Prisma.EndpointWhereInput = {
      workspaceId,
    };

    if (options?.status && options.status !== "ALL") {
      where.status = options.status;
    }

    if (options?.search && options.search.trim() !== "") {
      const query = options.search.trim();
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { url: { contains: query, mode: "insensitive" } },
      ];
    }

    return db.endpoint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        config: true,
        checks: {
          take: 1, // High performance: only latest check needed for list views
          orderBy: { checkedAt: "desc" },
          select: {
            id: true,
            status: true,
            statusCode: true,
            responseTimeMs: true,
            checkedAt: true,
          },
        },
      },
    });
  }

  /**
   * Fetch a single endpoint by its ID with full configuration and history checks.
   */
  static async getEndpointById(id: string, workspaceId?: string) {
    const where: Prisma.EndpointWhereInput = { id };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    return db.endpoint.findFirst({
      where,
      include: {
        config: true,
        documentation: true,
        incidents: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
        checks: {
          orderBy: { checkedAt: "desc" },
          take: 50,
        },
      },
    });
  }

  /**
   * Create an endpoint and register its monitoring schedule.
   */
  static async createEndpoint(input: CreateEndpointInput, workspaceId: string) {
    // 1. Quota & usage bounds enforcement
    await UsageLimitsService.assertCanCreateEndpoint(workspaceId);
    await UsageLimitsService.assertValidInterval(workspaceId, input.intervalSeconds);

    // 2. SSRF pre-check
    await validateSafeUrl(input.url);

    // Convert request headers array to encrypted JSON string if present
    let encryptedHeaders: string | null = null;
    if (input.requestHeaders && input.requestHeaders.length > 0) {
      const headersObject: Record<string, string> = {};
      for (const h of input.requestHeaders) {
        if (h.key.trim()) {
          headersObject[h.key.trim()] = h.value;
        }
      }
      if (Object.keys(headersObject).length > 0) {
        encryptedHeaders = encryptCredential(JSON.stringify(headersObject));
      }
    }

    const primaryStatusCode = input.expectedStatusCodes
      ? parseInt(input.expectedStatusCodes.split(",")[0].trim(), 10) || 200
      : 200;

    const endpoint = await db.endpoint.create({
      data: {
        workspaceId,
        name: input.name,
        url: input.url,
        method: input.method,
        intervalSeconds: input.intervalSeconds,
        timeoutMs: input.timeoutMs,
        status: EndpointStatus.PENDING,
        config: {
          create: {
            expectedStatusCodes: [primaryStatusCode],
            requestHeadersEncrypted: encryptedHeaders,
            requestBody: input.requestBody || null,
            expectedBodyContains: input.expectedBodyContains || null,
            expectedBodyNotContains: input.expectedBodyNotContains || null,
            followRedirects: input.followRedirects ?? false,
          },
        },
      },
      include: {
        config: true,
      },
    });

    // Schedule monitoring recurring job
    await scheduleEndpointCheck(endpoint.id, input.intervalSeconds);

    // Trigger initial check immediately
    await triggerImmediateCheck(endpoint.id);

    return endpoint;
  }

  /**
   * Update an existing endpoint and sync recurring scheduler.
   */
  static async updateEndpoint(id: string, input: UpdateEndpointInput, workspaceId?: string) {
    const existing = await this.getEndpointById(id, workspaceId);
    if (!existing) {
      throw new Error("Endpoint not found");
    }

    if (input.intervalSeconds !== undefined) {
      await UsageLimitsService.assertValidInterval(workspaceId || existing.workspaceId, input.intervalSeconds);
    }

    if (input.url && input.url !== existing.url) {
      await validateSafeUrl(input.url);
    }

    let encryptedHeaders: string | undefined = undefined;
    if (input.requestHeaders !== undefined) {
      const headersObject: Record<string, string> = {};
      for (const h of input.requestHeaders) {
        if (h.key.trim()) {
          headersObject[h.key.trim()] = h.value;
        }
      }
      encryptedHeaders = encryptCredential(JSON.stringify(headersObject));
    }

    const primaryStatusCode = input.expectedStatusCodes
      ? parseInt(input.expectedStatusCodes.split(",")[0].trim(), 10) || 200
      : undefined;

    const updated = await db.endpoint.update({
      where: { id },
      data: {
        name: input.name,
        url: input.url,
        method: input.method,
        intervalSeconds: input.intervalSeconds,
        timeoutMs: input.timeoutMs,
        status: input.status,
        config: {
          update: {
            expectedStatusCodes: primaryStatusCode ? [primaryStatusCode] : undefined,
            requestHeadersEncrypted: encryptedHeaders,
            requestBody: input.requestBody !== undefined ? input.requestBody : undefined,
            expectedBodyContains: input.expectedBodyContains,
            expectedBodyNotContains: input.expectedBodyNotContains,
            followRedirects: input.followRedirects,
          },
        },
      },
      include: {
        config: true,
      },
    });

    if (input.intervalSeconds && updated.status !== "PAUSED") {
      await scheduleEndpointCheck(id, input.intervalSeconds);
    }

    return updated;
  }

  /**
   * Delete endpoint and clean up background scheduler.
   */
  static async deleteEndpoint(id: string, workspaceId?: string) {
    const existing = await this.getEndpointById(id, workspaceId);
    if (!existing) {
      throw new Error("Endpoint not found");
    }

    await removeEndpointSchedule(id);
    return db.endpoint.delete({
      where: { id },
    });
  }

  /**
   * Pause monitoring for an endpoint.
   */
  static async pauseEndpoint(id: string, workspaceId?: string) {
    const existing = await this.getEndpointById(id, workspaceId);
    if (!existing) {
      throw new Error("Endpoint not found");
    }

    await removeEndpointSchedule(id);

    return db.endpoint.update({
      where: { id },
      data: { status: EndpointStatus.PAUSED },
    });
  }

  /**
   * Resume monitoring for a paused endpoint.
   */
  static async resumeEndpoint(id: string, workspaceId?: string) {
    const existing = await this.getEndpointById(id, workspaceId);
    if (!existing) {
      throw new Error("Endpoint not found");
    }

    const interval = existing.intervalSeconds || 60;
    await scheduleEndpointCheck(id, interval);
    await triggerImmediateCheck(id);

    return db.endpoint.update({
      where: { id },
      data: { status: EndpointStatus.PENDING },
    });
  }
}
