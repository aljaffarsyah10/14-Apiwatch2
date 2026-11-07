import { describe, it, expect } from "vitest";
import { validateSafeUrl, isIpBlocked, SSRFError } from "../ssrf-guard";

describe("SSRF Guard & Subnet Filter", () => {
  describe("isIpBlocked", () => {
    it("should block loopback IPv4 addresses", () => {
      expect(isIpBlocked("127.0.0.1")).toBe(true);
      expect(isIpBlocked("127.0.0.2")).toBe(true);
      expect(isIpBlocked("127.255.255.255")).toBe(true);
    });

    it("should block private RFC-1918 subnets", () => {
      expect(isIpBlocked("10.0.0.1")).toBe(true);
      expect(isIpBlocked("10.255.255.255")).toBe(true);
      expect(isIpBlocked("172.16.0.1")).toBe(true);
      expect(isIpBlocked("172.31.255.255")).toBe(true);
      expect(isIpBlocked("192.168.1.1")).toBe(true);
      expect(isIpBlocked("192.168.0.254")).toBe(true);
    });

    it("should block cloud metadata and link-local addresses", () => {
      expect(isIpBlocked("169.254.169.254")).toBe(true);
      expect(isIpBlocked("169.254.1.1")).toBe(true);
    });

    it("should block loopback and unique-local IPv6 addresses", () => {
      expect(isIpBlocked("::1")).toBe(true);
      expect(isIpBlocked("fc00::1")).toBe(true);
      expect(isIpBlocked("fd12:3456:789a::1")).toBe(true);
      expect(isIpBlocked("fe80::1")).toBe(true);
    });

    it("should permit legitimate public routable IPs", () => {
      expect(isIpBlocked("8.8.8.8")).toBe(false);
      expect(isIpBlocked("1.1.1.1")).toBe(false);
      expect(isIpBlocked("142.250.190.46")).toBe(false);
    });
  });

  describe("validateSafeUrl", () => {
    it("should reject non-HTTP/HTTPS schemes", async () => {
      await expect(validateSafeUrl("file:///etc/passwd")).rejects.toThrow(SSRFError);
      await expect(validateSafeUrl("ftp://ftp.example.com/file")).rejects.toThrow(SSRFError);
      await expect(validateSafeUrl("gopher://localhost:70")).rejects.toThrow(SSRFError);
    });

    it("should reject localhost and internal hostnames", async () => {
      await expect(validateSafeUrl("http://localhost:3000")).rejects.toThrow(SSRFError);
      await expect(validateSafeUrl("http://127.0.0.1:8080")).rejects.toThrow(SSRFError);
      await expect(validateSafeUrl("http://0.0.0.0:80")).rejects.toThrow(SSRFError);
      await expect(validateSafeUrl("http://metadata.google.internal")).rejects.toThrow(SSRFError);
    });

    it("should reject URLs containing embedded credentials in userinfo", async () => {
      await expect(validateSafeUrl("https://admin:secret@example.com/api")).rejects.toThrow(SSRFError);
    });

    it("should accept valid public HTTPS URLs", async () => {
      const result = await validateSafeUrl("https://1.1.1.1/dns-query");
      expect(result.resolvedIp).toBe("1.1.1.1");
      expect(result.hostname).toBe("1.1.1.1");
    });
  });
});
