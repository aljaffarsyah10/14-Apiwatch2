import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { signSession, verifySession } from "../session";

describe("Session Security & Token Verification", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "super-secret-auth-key-32-characters-minimum-length!";
  });

  it("should sign and verify valid session payload correctly", () => {
    const payload = {
      userId: "user-12345",
      email: "engineer@company.com",
      name: "Lead Engineer",
      workspaceId: "ws-9876",
    };

    const token = signSession(payload);
    expect(typeof token).toBe("string");
    expect(token).toContain(".");

    const verified = verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.workspaceId).toBe(payload.workspaceId);
    expect(verified?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("should reject tampered payload", () => {
    const token = signSession({
      userId: "user-12345",
      email: "engineer@company.com",
      workspaceId: "ws-9876",
    });

    const [payloadBase64, signature] = token.split(".");
    // Decode payload, modify userId, and re-encode without matching secret signature
    const decoded = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
    decoded.userId = "hacker-999";
    const tamperedBase64 = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const tamperedToken = `${tamperedBase64}.${signature}`;

    expect(verifySession(tamperedToken)).toBeNull();
  });

  it("should reject tampered signature", () => {
    const token = signSession({
      userId: "user-12345",
      email: "engineer@company.com",
      workspaceId: "ws-9876",
    });

    const [payloadBase64] = token.split(".");
    const invalidSignature = "invalid_forged_signature_xyz";
    const tamperedToken = `${payloadBase64}.${invalidSignature}`;

    expect(verifySession(tamperedToken)).toBeNull();
  });

  it("should reject malformed or empty token", () => {
    expect(verifySession("")).toBeNull();
    expect(verifySession("no-dots-token")).toBeNull();
    expect(verifySession(".")).toBeNull();
  });

  it("should reject expired token", () => {
    // Manually create expired payload signed with same secret
    const expiredPayload = {
      userId: "user-expired",
      email: "old@company.com",
      workspaceId: "ws-1",
      expiresAt: Date.now() - 10000, // 10 seconds in the past
    };

    const payloadBase64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", process.env.AUTH_SECRET!)
      .update(payloadBase64)
      .digest("base64url");

    const expiredToken = `${payloadBase64}.${signature}`;
    expect(verifySession(expiredToken)).toBeNull();
  });
});
