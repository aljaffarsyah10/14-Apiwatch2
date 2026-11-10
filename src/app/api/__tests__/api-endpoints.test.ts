import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginHandler } from "../auth/login/route";
import { POST as registerHandler } from "../auth/register/route";
import { POST as bulkHandler } from "../endpoints/bulk/route";
import { GET as healthHandler } from "../health/route";
import db from "@/lib/db";
import { defaultRedis } from "@/lib/queue/redis";

vi.mock("@/lib/db", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    endpoint: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/queue/redis", () => ({
  defaultRedis: {
    ping: vi.fn(),
  },
}));

vi.mock("@/lib/queue/scheduler", () => ({
  scheduleEndpointCheck: vi.fn().mockResolvedValue(undefined),
  removeEndpointSchedule: vi.fn().mockResolvedValue(undefined),
  triggerImmediateCheck: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionOrDefault: vi.fn().mockResolvedValue({
    userId: "usr_mock_123",
    email: "mock@apiwatch.local",
    workspaceId: "ws_mock_456",
    expiresAt: Date.now() + 100000,
  }),
  setSessionCookie: vi.fn().mockResolvedValue(undefined),
  clearSessionCookie: vi.fn().mockResolvedValue(undefined),
}));

describe("API Route Handlers (API Testing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("returns 400 when email or password is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("Valid email and password are required");
    });

    it("returns 401 when user is not found in database", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "unknown@example.com", password: "somePassword123" }),
      });

      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid email or password");
    });
  });

  describe("POST /api/auth/register", () => {
    it("returns 400 when password is shorter than 8 characters", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "123",
          name: "Test User",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("between 8 and 255 characters");
    });

    it("returns 409 when user already exists", async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: "usr_existing",
        email: "existing@example.com",
        passwordHash: "hash",
        name: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "ValidPassword123!",
          name: "Existing",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("already exists");
    });
  });

  describe("POST /api/endpoints/bulk", () => {
    it("returns 400 for unsupported actions or empty id list", async () => {
      const req1 = new NextRequest("http://localhost:3000/api/endpoints/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", ids: [] }),
      });
      const res1 = await bulkHandler(req1);
      expect(res1.status).toBe(400);

      const req2 = new NextRequest("http://localhost:3000/api/endpoints/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalid_action", ids: ["ep_1"] }),
      });
      const res2 = await bulkHandler(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error).toContain("Unsupported bulk action");
    });

    it("returns 404 when none of requested endpoints belong to caller workspace", async () => {
      vi.mocked(db.endpoint.findMany).mockResolvedValueOnce([]);

      const req = new NextRequest("http://localhost:3000/api/endpoints/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: ["alien_ep_1", "alien_ep_2"] }),
      });

      const res = await bulkHandler(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain("No matching endpoints found");
    });
  });

  describe("GET /api/health", () => {
    it("returns 200 healthy when DB and Redis are responsive", async () => {
      vi.mocked(db.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }] as unknown as unknown[]);
      vi.mocked(defaultRedis.ping).mockResolvedValueOnce("PONG");

      const res = await healthHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("healthy");
      expect(json.services.database).toBe("connected");
      expect(json.services.redis).toBe("connected");
    });

    it("returns 200 degraded when Redis is down but DB is healthy", async () => {
      vi.mocked(db.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }] as unknown as unknown[]);
      vi.mocked(defaultRedis.ping).mockRejectedValueOnce(new Error("Connection refused"));

      const res = await healthHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("degraded");
      expect(json.services.database).toBe("connected");
      expect(json.services.redis).toBe("disconnected");
    });

    it("returns 503 unhealthy when both DB and Redis are down", async () => {
      vi.mocked(db.$queryRaw).mockRejectedValueOnce(new Error("DB Down"));
      vi.mocked(defaultRedis.ping).mockRejectedValueOnce(new Error("Redis Down"));

      const res = await healthHandler();
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.status).toBe("unhealthy");
    });
  });
});
