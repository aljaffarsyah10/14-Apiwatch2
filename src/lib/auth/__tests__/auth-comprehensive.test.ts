import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signSession, verifySession } from "../session";

describe("Authentication & Session Integrity Tests", () => {
  describe("Password Hashing & Verification", () => {
    it("hashes password with high-entropy salt and verifies correctly", async () => {
      const rawPassword = "StrongP@ssw0rd!2026";
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(rawPassword, salt);

      expect(hash).not.toBe(rawPassword);
      expect(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$")).toBe(true);

      const isMatch = await bcrypt.compare(rawPassword, hash);
      expect(isMatch).toBe(true);

      const isMismatch = await bcrypt.compare("WrongPassword", hash);
      expect(isMismatch).toBe(false);
    });
  });

  describe("Session Token Sign & Verify", () => {
    it("signs valid payload and successfully verifies session data", () => {
      const userPayload = {
        userId: "usr_99812",
        email: "engineer@company.test",
        name: "Security Engineer",
        workspaceId: "ws_4431",
      };

      const token = signSession(userPayload);
      expect(token).toBeDefined();
      expect(token.includes(".")).toBe(true);

      const verified = verifySession(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(userPayload.userId);
      expect(verified?.email).toBe(userPayload.email);
      expect(verified?.workspaceId).toBe(userPayload.workspaceId);
      expect(verified?.expiresAt).toBeGreaterThan(Date.now());
    });

    it("rejects token when signature is altered or tampered with", () => {
      const token = signSession({
        userId: "usr_attacker",
        email: "attacker@test.com",
        workspaceId: "ws_target",
      });

      const parts = token.split(".");
      const forgedSignature = "invalidsignature" + parts[1].slice(16);
      const tamperedToken = `${parts[0]}.${forgedSignature}`;

      const verified = verifySession(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects token when payload JSON is altered", () => {
      const token = signSession({
        userId: "usr_normal",
        email: "user@test.com",
        workspaceId: "ws_normal",
      });

      const [, signature] = token.split(".");
      // Attacker attempts privilege escalation to another workspace
      const forgedPayload = Buffer.from(
        JSON.stringify({
          userId: "usr_normal",
          email: "user@test.com",
          workspaceId: "ws_ADMIN_PRIVILEGE",
          expiresAt: Date.now() + 100000,
        })
      ).toString("base64url");

      const forgedToken = `${forgedPayload}.${signature}`;
      expect(verifySession(forgedToken)).toBeNull();
    });

    it("rejects expired session tokens", () => {
      const pastTime = Date.now() - 10000;
      const expiredPayload = {
        userId: "usr_expired",
        email: "expired@test.com",
        workspaceId: "ws_123",
        expiresAt: pastTime,
      };

      const payloadBase64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
      const secret = "default-fallback-secret-for-apiwatch-dev-only-32bytes!";
      const signature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("base64url");
      const expiredToken = `${payloadBase64}.${signature}`;

      expect(verifySession(expiredToken)).toBeNull();
    });

    it("returns null for malformed tokens or empty strings", () => {
      expect(verifySession("")).toBeNull();
      expect(verifySession("not-a-token")).toBeNull();
      expect(verifySession("..")).toBeNull();
      expect(verifySession("part1.part2.part3")).toBeNull();
    });
  });
});
