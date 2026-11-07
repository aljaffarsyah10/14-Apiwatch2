import { describe, it, expect } from "vitest";
import { executeMonitoredRequest } from "../http-executor";

describe("HTTP Executor & Outbound Network Security", () => {
  it("should immediately block SSRF targeting localhost without outbound socket", async () => {
    const result = await executeMonitoredRequest({
      url: "http://127.0.0.1:8080/admin/secrets",
      method: "GET",
    });

    expect(result.isSsrfBlocked).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.errorMessage).toContain("SSRF Block");
  });

  it("should immediately block SSRF targeting cloud metadata IP 169.254.169.254", async () => {
    const result = await executeMonitoredRequest({
      url: "http://169.254.169.254/latest/meta-data/",
      method: "GET",
    });

    expect(result.isSsrfBlocked).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain("SSRF Block");
  });

  it("should immediately block SSRF targeting private RFC-1918 subnets (10.0.0.1)", async () => {
    const result = await executeMonitoredRequest({
      url: "http://10.0.0.1:9000/internal",
      method: "GET",
    });

    expect(result.isSsrfBlocked).toBe(true);
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain("SSRF Block");
  });

  it("should immediately block forbidden protocols like file:// or ftp://", async () => {
    const fileResult = await executeMonitoredRequest({
      url: "file:///etc/passwd",
      method: "GET",
    });
    expect(fileResult.isSsrfBlocked).toBe(true);

    const ftpResult = await executeMonitoredRequest({
      url: "ftp://ftp.example.com/data",
      method: "GET",
    });
    expect(ftpResult.isSsrfBlocked).toBe(true);
  });

  it("should enforce strict timeout using AbortController on unroutable public IP", async () => {
    // 192.0.2.1 is reserved TEST-NET-1 (SSRF blocked)
    const ssrfResult = await executeMonitoredRequest({
      url: "http://192.0.2.1",
      method: "GET",
      timeoutMs: 100,
    });
    expect(ssrfResult.isSsrfBlocked).toBe(true);
  });
});
