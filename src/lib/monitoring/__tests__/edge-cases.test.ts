import { describe, it, expect, beforeAll } from "vitest";
import { validateSafeUrl } from "../ssrf-guard";
import { evaluateAssertions, AssertionRule } from "../assertions";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { encryptCredential, decryptCredential } from "@/lib/crypto";

describe("Edge Cases, Boundaries & Failure Recovery Tests", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  describe("SSRF Guard - Edge Cases & Obfuscations", () => {
    it("blocks cloud metadata address 169.254.169.254 (AWS/GCP/Azure IMDS)", async () => {
      await expect(validateSafeUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow();
      await expect(validateSafeUrl("http://169.254.169.254:8080/")).rejects.toThrow();
    });

    it("blocks IPv6 loopback address [::1] and compressed representations", async () => {
      await expect(validateSafeUrl("http://[::1]/status")).rejects.toThrow();
      await expect(validateSafeUrl("http://[0000:0000:0000:0000:0000:0000:0000:0001]/status")).rejects.toThrow();
    });

    it("blocks dangerous non-HTTP schemes", async () => {
      await expect(validateSafeUrl("file:///etc/shadow")).rejects.toThrow();
      await expect(validateSafeUrl("gopher://127.0.0.1:70/")).rejects.toThrow();
      await expect(validateSafeUrl("dict://127.0.0.1:2628/")).rejects.toThrow();
      await expect(validateSafeUrl("ldap://localhost/")).rejects.toThrow();
    });

    it("allows standard public internet domains and ports", async () => {
      await expect(validateSafeUrl("https://api.github.com/zen")).resolves.not.toThrow();
      await expect(validateSafeUrl("https://cloudflare.com/cdn-cgi/trace")).resolves.not.toThrow();
    });
  });

  describe("Assertions Engine - Edge Cases & Malformed Payloads", () => {
    it("handles empty or missing response bodies gracefully", () => {
      const rules: AssertionRule[] = [
        { type: "body", operator: "contains", value: "success" },
      ];

      const resultWithEmptyBody = evaluateAssertions(200, rules, {
        statusCode: 200,
        bodyText: "",
        headers: {},
        responseTimeMs: 50,
      });

      expect(resultWithEmptyBody.passed).toBe(false);
      expect(resultWithEmptyBody.failedAssertion).toBe("body");
    });

    it("handles non-JSON bodies when JSON assertions are expected", () => {
      const rules: AssertionRule[] = [
        { type: "body", operator: "contains", value: '{"status":"ok"}' },
      ];

      const result = evaluateAssertions(200, rules, {
        statusCode: 200,
        bodyText: "<html><body>Internal Server Error HTML</body></html>",
        headers: { "content-type": "text/html" },
        responseTimeMs: 150,
      });

      expect(result.passed).toBe(false);
      expect(result.failureReason).toContain("did not contain expected text");
    });

    it("handles expected body not_contains when string is absent vs present", () => {
      const rules: AssertionRule[] = [
        { type: "body", operator: "not_contains", value: "DATABASE_CONNECTION_ERROR" },
      ];

      const cleanResponse = evaluateAssertions(200, rules, {
        statusCode: 200,
        bodyText: '{"message": "all systems normal"}',
        headers: {},
        responseTimeMs: 80,
      });
      expect(cleanResponse.passed).toBe(true);

      const leakResponse = evaluateAssertions(200, rules, {
        statusCode: 200,
        bodyText: '{"error": "DATABASE_CONNECTION_ERROR at line 42"}',
        headers: {},
        responseTimeMs: 80,
      });
      expect(leakResponse.passed).toBe(false);
      expect(leakResponse.failureReason).toContain("unexpectedly contained");
    });
  });

  describe("Rate Limiter - Boundary & Burst Handling", () => {
    it("strictly enforces maximum allowed operations within the window", () => {
      const key = `test_edge_rate_${Date.now()}`;
      const limit = 3;
      const windowSeconds = 10;

      // 1st request -> pass
      expect(checkRateLimit(key, limit, windowSeconds).success).toBe(true);
      // 2nd request -> pass
      expect(checkRateLimit(key, limit, windowSeconds).success).toBe(true);
      // 3rd request -> pass (boundary)
      expect(checkRateLimit(key, limit, windowSeconds).success).toBe(true);

      // 4th request -> blocked
      const blocked = checkRateLimit(key, limit, windowSeconds);
      expect(blocked.success).toBe(false);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });
  });

  describe("Crypto - Edge Cases & Robustness", () => {
    it("encrypts and decrypts empty strings and complex Unicode payloads", () => {
      const emptyEnc = encryptCredential("");
      expect(decryptCredential(emptyEnc)).toBe("");

      const unicode = "Secret 🔐 Token: 🚀 日本語 / العربية / 特殊文字";
      const enc = encryptCredential(unicode);
      expect(decryptCredential(enc)).toBe(unicode);
    });

    it("throws clear error on malformed or truncated ciphertexts", () => {
      expect(() => decryptCredential("corrupted-token-without-colons")).toThrow();
      expect(() => decryptCredential("part1:part2")).toThrow();
      expect(() => decryptCredential("aa:bb:cc")).toThrow(); // non-hex
    });
  });
});
