import { z } from "zod";

export const httpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
export const endpointStatuses = ["UP", "DOWN", "PAUSED", "PENDING"] as const;

export const headerKeyValueSchema = z.object({
  key: z.string().min(1, "Header name is required"),
  value: z.string().min(1, "Header value is required"),
});

export const endpointFormSchema = z.object({
  name: z
    .string()
    .min(2, "Endpoint name must be at least 2 characters")
    .max(100, "Endpoint name cannot exceed 100 characters"),
  url: z
    .string()
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
    .refine(
      (val) =>
        val
          .split(",")
          .map((s) => s.trim())
          .every((s) => /^[1-5][0-9]{2}$/.test(s)),
      { message: "All status codes must be valid 3-digit HTTP codes (e.g., 200, 201)" }
    ),
  requestHeaders: z.array(headerKeyValueSchema),
  requestBody: z.string().optional(),
  expectedBodyContains: z.string().optional(),
  expectedBodyNotContains: z.string().optional(),
  followRedirects: z.boolean(),
});

export type EndpointFormValues = z.infer<typeof endpointFormSchema>;
