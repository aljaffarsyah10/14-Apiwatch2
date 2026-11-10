import { describe, it, expect } from "vitest";
import { endpointFormSchema, headerKeyValueSchema } from "../endpoint.schema";

describe("Endpoint Schema & Form Validations (Unit Testing)", () => {
  const validData = {
    name: "Production Gateway",
    url: "https://api.example.com/health",
    method: "GET" as const,
    intervalSeconds: 60,
    timeoutMs: 5000,
    expectedStatusCodes: "200, 201",
    requestHeaders: [{ key: "X-API-Key", value: "secret-token-123" }],
    requestBody: "{\"check\": true}",
    expectedBodyContains: "ok",
    expectedBodyNotContains: "error",
    followRedirects: true,
  };

  it("successfully parses valid endpoint configuration", () => {
    const result = endpointFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Production Gateway");
      expect(result.data.method).toBe("GET");
      expect(result.data.intervalSeconds).toBe(60);
    }
  });

  it("rejects names shorter than 2 characters or longer than 100 characters", () => {
    const tooShort = endpointFormSchema.safeParse({ ...validData, name: "A" });
    expect(tooShort.success).toBe(false);

    const tooLong = endpointFormSchema.safeParse({ ...validData, name: "A".repeat(101) });
    expect(tooLong.success).toBe(false);
  });

  it("rejects non-HTTP/HTTPS protocols (e.g. ftp, file, gopher, javascript)", () => {
    const ftp = endpointFormSchema.safeParse({ ...validData, url: "ftp://files.example.com" });
    expect(ftp.success).toBe(false);

    const file = endpointFormSchema.safeParse({ ...validData, url: "file:///etc/passwd" });
    expect(file.success).toBe(false);

    const js = endpointFormSchema.safeParse({ ...validData, url: "javascript:alert(1)" });
    expect(js.success).toBe(false);
  });

  it("enforces intervalSeconds between 60 and 86400", () => {
    const belowMin = endpointFormSchema.safeParse({ ...validData, intervalSeconds: 30 });
    expect(belowMin.success).toBe(false);

    const aboveMax = endpointFormSchema.safeParse({ ...validData, intervalSeconds: 90000 });
    expect(aboveMax.success).toBe(false);

    const validInterval = endpointFormSchema.safeParse({ ...validData, intervalSeconds: 300 });
    expect(validInterval.success).toBe(true);
  });

  it("enforces timeoutMs bounds between 1000 and 30000", () => {
    const tooLow = endpointFormSchema.safeParse({ ...validData, timeoutMs: 500 });
    expect(tooLow.success).toBe(false);

    const tooHigh = endpointFormSchema.safeParse({ ...validData, timeoutMs: 35000 });
    expect(tooHigh.success).toBe(false);
  });

  it("validates expected status codes formatting", () => {
    const invalidFormat = endpointFormSchema.safeParse({
      ...validData,
      expectedStatusCodes: "200, 999",
    });
    expect(invalidFormat.success).toBe(false);

    const textInsteadOfNumbers = endpointFormSchema.safeParse({
      ...validData,
      expectedStatusCodes: "200, OK",
    });
    expect(textInsteadOfNumbers.success).toBe(false);

    const multiValid = endpointFormSchema.safeParse({
      ...validData,
      expectedStatusCodes: "200, 201, 204",
    });
    expect(multiValid.success).toBe(true);
  });

  describe("headerKeyValueSchema", () => {
    it("accepts valid header names and values", () => {
      const valid = headerKeyValueSchema.safeParse({
        key: "Authorization",
        value: "Bearer xyz-token",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects invalid header keys with special characters or spaces", () => {
      const invalid = headerKeyValueSchema.safeParse({
        key: "X Header With Spaces",
        value: "val",
      });
      expect(invalid.success).toBe(false);
    });
  });
});
