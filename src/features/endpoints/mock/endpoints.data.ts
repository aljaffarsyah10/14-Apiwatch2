export interface MockEndpoint {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  intervalSeconds: number;
  timeoutMs: number;
  status: "UP" | "DOWN" | "PAUSED" | "PENDING";
  isActive: boolean;
  configVersion: number;
  expectedStatusCodes: number[];
  latency: string;
  uptime30d: string;
  lastChecked: string;
  requestHeaders?: { key: string; value: string }[];
  requestBody?: string;
  expectedBodyContains?: string;
  description?: string;
}

export const initialMockEndpoints: MockEndpoint[] = [
  {
    id: "ep-1",
    name: "Stripe Webhook Gateway",
    url: "https://api.stripe.com/v1/events",
    method: "POST",
    intervalSeconds: 300,
    timeoutMs: 10000,
    status: "UP",
    isActive: true,
    configVersion: 1,
    expectedStatusCodes: [200, 201],
    latency: "84ms",
    uptime30d: "99.98%",
    lastChecked: "2 minutes ago",
    description: "Production Stripe Webhook event consumer. Verifies signature headers.",
    requestHeaders: [{ key: "Stripe-Signature", value: "whsec_test_token" }],
  },
  {
    id: "ep-2",
    name: "User Authentication Service",
    url: "https://auth.apiwatch.dev/v1/verify",
    method: "GET",
    intervalSeconds: 60,
    timeoutMs: 5000,
    status: "UP",
    isActive: true,
    configVersion: 2,
    expectedStatusCodes: [200],
    latency: "112ms",
    uptime30d: "100.0%",
    lastChecked: "30 seconds ago",
    description: "Core JWT verification route handler.",
  },
  {
    id: "ep-3",
    name: "Database Ingestion API",
    url: "https://data.apiwatch.dev/v1/ingest",
    method: "POST",
    intervalSeconds: 300,
    timeoutMs: 10000,
    status: "DOWN",
    isActive: true,
    configVersion: 1,
    expectedStatusCodes: [200, 202],
    latency: "1,240ms",
    uptime30d: "98.42%",
    lastChecked: "1 minute ago",
    description: "High-throughput metric ingestion pipeline.",
    expectedBodyContains: `"status":"ok"`,
  },
  {
    id: "ep-4",
    name: "Notification Dispatcher",
    url: "https://notify.apiwatch.dev/health",
    method: "GET",
    intervalSeconds: 600,
    timeoutMs: 10000,
    status: "PAUSED",
    isActive: false,
    configVersion: 1,
    expectedStatusCodes: [200],
    latency: "—",
    uptime30d: "99.50%",
    lastChecked: "1 hour ago",
    description: "SMTP email and transactional alert daemon.",
  },
];
