import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "../rate-limiter";
import { verifySession, signSession } from "../../auth/session";
import { decryptCredential } from "../../crypto";
import { endpointFormSchema } from "../../validations/endpoint.schema";

describe("Security Hardening & Vulnerability Defenses", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-key-that-is-at-least-32-characters-long!";
    process.env.ENCRYPTION_KEY = "12345678901234567890123456789012";
  });

  describe("Timing Attack Resistant Session Verification", () => {
    it("should accept validly signed session token", () => {
      const payload = {
        userId: "usr_safe",
        email: "secops@company.com",
        workspaceId: "ws_safe",
      };
      const token = signSession(payload);
      const verified = verifySession(token);

      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe("usr_safe");
    });

    it("should reject signature with modified byte", () => {
      const token = signSession({
        userId: "usr_safe",
        email: "secops@company.com",
        workspaceId: "ws_safe",
      });

      const [payloadBase64, signature] = token.split(".");
      // Flip a character in signature
      const lastChar = signature[signature.length - 1];
      const alteredSig = signature.slice(0, -1) + (lastChar === "a" ? "b" : "a");

      expect(verifySession(`${payloadBase64}.${alteredSig}`)).toBeNull();
    });

    it("should reject truncated or mismatched length signature without throwing", () => {
      const token = signSession({
        userId: "usr_safe",
        email: "secops@company.com",
        workspaceId: "ws_safe",
      });

      const [payloadBase64, signature] = token.split(".");
      expect(verifySession(`${payloadBase64}.${signature.slice(0, 10)}`)).toBeNull();
      expect(verifySession(`${payloadBase64}.${signature + "extra"}`)).toBeNull();
    });
  });

  describe("In-Memory Sliding Window Rate Limiting", () => {
    it("should allow requests up to the configured limit", () => {
      const key = `test_client_${Date.now()}`;
      const limit = 5;

      for (let i = 0; i < limit; i++) {
        const res = checkRateLimit(key, limit, 10);
        expect(res.success).toBe(true);
        expect(res.remaining).toBe(limit - 1 - i);
      }

      // 6th request must be rejected with 429 semantics
      const blocked = checkRateLimit(key, limit, 10);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });
  });

  describe("Cryptographic Boundaries & Malformed Input Handling", () => {
    it("should reject ciphertext with invalid IV length gracefully", () => {
      // Valid is 12 bytes = 24 hex chars
      const shortIv = "abcd:12345678901234567890123456789012:abcdef";
      expect(() => decryptCredential(shortIv)).toThrow(/Invalid IV length/);
    });

    it("should reject ciphertext with invalid AuthTag length gracefully", () => {
      // Valid tag is 16 bytes = 32 hex chars
      const shortTag = "123456789012345678901234:shorttag:abcdef";
      expect(() => decryptCredential(shortTag)).toThrow(/Invalid AuthTag length/);
    });
  });

  describe("Input Schema Boundary Validation", () => {
    it("should reject URLs longer than 2048 characters", () => {
      const longUrl = "https://example.com/" + "a".repeat(2050);
      const res = endpointFormSchema.safeParse({
        name: "Test Endpoint",
        url: longUrl,
        method: "GET",
        intervalSeconds: 60,
        timeoutMs: 5000,
        expectedStatusCodes: "200",
        requestHeaders: [],
        followRedirects: false,
      });

      expect(res.success).toBe(false);
    });

    it("should reject headers with invalid characters (CRLF injection prevention)", () => {
      const res = endpointFormSchema.safeParse({
        name: "Test Endpoint",
        url: "https://example.com/api",
        method: "GET",
        intervalSeconds: 60,
        timeoutMs: 5000,
        expectedStatusCodes: "200",
        requestHeaders: [{ key: "X-Injected\r\nSet-Cookie: evil=true", value: "test" }],
        followRedirects: false,
      });

      expect(res.success).toBe(false);
    });

    it("should reject payloads exceeding 64 KB", () => {
      const res = endpointFormSchema.safeParse({
        name: "Test Endpoint",
        url: "https://example.com/api",
        method: "POST",
        intervalSeconds: 60,
        timeoutMs: 5000,
        expectedStatusCodes: "200",
        requestHeaders: [],
        requestBody: "x".repeat(70000), // > 64KB
        followRedirects: false,
      });

      expect(res.success).toBe(false);
    });
  });
});
