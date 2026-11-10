import { z } from "zod";

export const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
export const endpointStatuses = ["UP", "DOWN", "PAUSED", "PENDING"] as const;

export const headerKeyValueSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Header name is required")
    .max(256, "Header name cannot exceed 256 characters")
    .refine((k) => /^[a-zA-Z0-9-_]+$/.test(k), {
      message: "Header name can only contain alphanumeric characters, hyphens, and underscores",
    }),
  value: z
    .string()
    .max(4096, "Header value cannot exceed 4,096 characters"),
});

export const endpointFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Endpoint name must be at least 2 characters")
    .max(100, "Endpoint name cannot exceed 100 characters"),
  url: z
    .string()
    .trim()
    .max(2048, "URL cannot exceed 2,048 characters")
    .url("Please enter a valid HTTP or HTTPS URL")
    .refine((val) => val.startsWith("http://") || val.startsWith("https://"), {
      message: "Protocol must be HTTP or HTTPS",
    }),
  method: z.enum(httpMethods),
  intervalSeconds: z
    .number()
    .int()
    .min(60, "Minimum check interval is 60 seconds (1 minute)")
    .max(86400, "Maximum interval is 24 hours"),
  timeoutMs: z
    .number()
    .int()
    .min(1000, "Minimum timeout is 1,000 ms")
    .max(30000, "Maximum timeout is 30,000 ms"),
  expectedStatusCodes: z
    .string()
    .min(1, "At least one expected status code is required")
    .max(100, "Expected status codes list cannot exceed 100 characters")
    .refine(
      (val) =>
        val
          .split(",")
          .map((s) => s.trim())
          .every((s) => /^[1-5][0-9]{2}$/.test(s)),
      { message: "All status codes must be valid 3-digit HTTP codes (e.g., 200, 201)" }
    ),
  requestHeaders: z.array(headerKeyValueSchema).max(50, "Maximum 50 custom headers allowed"),
  requestBody: z.string().max(65536, "Request body cannot exceed 64 KB").optional(),
  expectedBodyContains: z.string().max(1024, "Expected string cannot exceed 1,024 characters").optional(),
  expectedBodyNotContains: z.string().max(1024, "Expected string cannot exceed 1,024 characters").optional(),
  followRedirects: z.boolean(),
});

export type EndpointFormValues = z.infer<typeof endpointFormSchema>;
