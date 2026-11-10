# APIWatch REST API Documentation

This document describes the complete REST API specification for **APIWatch (v2.0)**, an automated API health monitoring, outage alerting, and SLA reporting platform.

---

## 1. Overview & General Conventions

- **Base URL**: `/api` (e.g. `https://apiwatch.io/api` or `http://localhost:3000/api`)
- **Protocol**: HTTPS (enforced in production with HSTS and TLS 1.3)
- **Data Format**: `application/json; charset=utf-8`
- **Authentication**: Stateless HMAC-signed session cookie (`apiwatch_session` or `__Host-apiwatch_session`)
- **Rate Limiting**: Sliding window rate limiter (60 requests per 60 seconds per IP/client token)
- **Error Standard**: RFC 7807 Problem Details style JSON errors:
  ```json
  {
    "error": "Error message description",
    "code": "ERROR_CODE",
    "details": {}
  }
  ```

---

## 2. Authentication APIs

### 2.1 Register User
- **Method & Path**: `POST /api/auth/register`
- **Auth Required**: No (Public)
- **Description**: Registers a new user account, creates an isolated personal workspace, provisions a default 14-day Pro trial subscription, and sets an HMAC-signed session cookie.
- **Request Body**:
  ```json
  {
    "email": "developer@company.com",
    "password": "StrongPassword123!",
    "name": "Jane Doe"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "user": {
      "id": "usr_94b1ef47",
      "email": "developer@company.com",
      "name": "Jane Doe",
      "role": "ADMIN",
      "workspaceId": "ws_c41a298f"
    }
  }
  ```

### 2.2 Login User
- **Method & Path**: `POST /api/auth/login`
- **Auth Required**: No (Public)
- **Description**: Authenticates user credentials using 12-round bcrypt comparison and issues a secure `HttpOnly; Secure; SameSite=Lax` session cookie.
- **Request Body**:
  ```json
  {
    "email": "developer@company.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": "usr_94b1ef47",
      "email": "developer@company.com",
      "name": "Jane Doe",
      "role": "ADMIN",
      "workspaceId": "ws_c41a298f"
    }
  }
  ```

### 2.3 Get Current User Session
- **Method & Path**: `GET /api/auth/me`
- **Auth Required**: Yes
- **Description**: Retrieves session data for the currently authenticated user.
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": "usr_94b1ef47",
      "email": "developer@company.com",
      "name": "Jane Doe",
      "role": "ADMIN",
      "workspaceId": "ws_c41a298f"
    }
  }
  ```

### 2.4 Logout
- **Method & Path**: `POST /api/auth/logout`
- **Auth Required**: No
- **Description**: Clears session cookie by setting `Max-Age=0`.
- **Response**: `200 OK`
  ```json
  {
    "success": true
  }
  ```

---

## 3. Monitored Endpoints APIs

### 3.1 List Endpoints
- **Method & Path**: `GET /api/endpoints`
- **Auth Required**: Yes
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `search` (string, optional: search by name or URL)
  - `status` (string, optional: `HEALTHY` | `DEGRADED` | `DOWN` | `PAUSED`)
- **Response**: `200 OK`
  ```json
  {
    "endpoints": [
      {
        "id": "ep_87df3921",
        "name": "Production Checkout API",
        "url": "https://api.company.com/v1/checkout",
        "method": "POST",
        "interval": 60,
        "timeout": 5000,
        "status": "HEALTHY",
        "isPaused": false,
        "uptime24h": 99.98,
        "avgResponseTime": 142,
        "lastCheckedAt": "2026-11-10T14:30:00.000Z",
        "createdAt": "2026-11-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 3.2 Create Monitored Endpoint
- **Method & Path**: `POST /api/endpoints`
- **Auth Required**: Yes
- **Description**: Validates URL against multi-layer SSRF filter (blocking `127.0.0.1`, RFC1918, `169.254.169.254`), checks SaaS quota limits, and registers the endpoint for background queue monitoring.
- **Request Body**:
  ```json
  {
    "name": "Auth Token Refresh",
    "url": "https://auth.company.com/oauth/token",
    "method": "POST",
    "interval": 60,
    "timeout": 5000,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": "{\"grant_type\":\"client_credentials\"}",
    "expectedStatus": 200,
    "assertions": [
      { "type": "STATUS_CODE", "comparison": "EQUALS", "target": "200" },
      { "type": "RESPONSE_TIME", "comparison": "LESS_THAN", "target": "1000" }
    ]
  }
  ```
- **Response**: `201 Created`

### 3.3 Get Endpoint Details
- **Method & Path**: `GET /api/endpoints/:id`
- **Auth Required**: Yes
- **Response**: `200 OK`

### 3.4 Update Endpoint Settings
- **Method & Path**: `PATCH /api/endpoints/:id`
- **Auth Required**: Yes
- **Request Body**: Partial update of endpoint fields (`name`, `url`, `interval`, `timeout`, `headers`, `body`, `expectedStatus`).
- **Response**: `200 OK`

### 3.5 Delete Endpoint
- **Method & Path**: `DELETE /api/endpoints/:id`
- **Auth Required**: Yes
- **Response**: `200 OK`
  ```json
  { "success": true, "deletedId": "ep_87df3921" }
  ```

### 3.6 Immediate On-Demand Probe Check
- **Method & Path**: `POST /api/endpoints/:id/check`
- **Auth Required**: Yes
- **Description**: Immediately dispatches an active HTTP probe check through the SSRF-guarded executor and stores check results.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "result": {
      "statusCode": 200,
      "responseTime": 128,
      "isHealthy": true,
      "checkedAt": "2026-11-10T14:35:00.000Z"
    }
  }
  ```

### 3.7 Clone Endpoint
- **Method & Path**: `POST /api/endpoints/:id/clone`
- **Auth Required**: Yes
- **Description**: Duplicates an existing endpoint's configuration with `(Copy)` suffix.
- **Response**: `201 Created`

### 3.8 Pause & Resume Endpoint
- **Method & Path**: `POST /api/endpoints/:id/pause`
- **Method & Path**: `POST /api/endpoints/:id/resume`
- **Auth Required**: Yes
- **Response**: `200 OK`

### 3.9 Endpoint Check History
- **Method & Path**: `GET /api/endpoints/:id/history`
- **Auth Required**: Yes
- **Query Parameters**: `limit` (default: 50)
- **Response**: `200 OK` with recent check results list.

### 3.10 Bulk Actions
- **Method & Path**: `POST /api/endpoints/bulk`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "action": "pause" | "resume" | "delete",
    "endpointIds": ["ep_1", "ep_2"]
  }
  ```
- **Response**: `200 OK`

### 3.11 Batch Check All Endpoints
- **Method & Path**: `POST /api/endpoints/check-all`
- **Auth Required**: Yes
- **Description**: Triggers concurrent probe checks for all active endpoints in the workspace.
- **Response**: `200 OK`

### 3.12 Ad-Hoc Probe Test
- **Method & Path**: `POST /api/endpoints/test`
- **Auth Required**: Yes
- **Description**: Performs a real-time dry-run HTTP check against the specified target without saving to the database.
- **Request Body**: `{ "url": "https://api.github.com/zen", "method": "GET" }`
- **Response**: `200 OK`

---

## 4. Incidents & Alerting APIs

### 4.1 List Workspace Incidents
- **Method & Path**: `GET /api/incidents`
- **Auth Required**: Yes
- **Query Parameters**:
  - `status`: `OPEN` | `ACKNOWLEDGED` | `RESOLVED`
  - `severity`: `CRITICAL` | `MAJOR` | `MINOR`
- **Response**: `200 OK`
  ```json
  {
    "incidents": [
      {
        "id": "inc_4410e2",
        "endpointId": "ep_87df3921",
        "endpointName": "Production Checkout API",
        "title": "Endpoint returning HTTP 500 Internal Server Error",
        "status": "OPEN",
        "severity": "CRITICAL",
        "startedAt": "2026-11-10T14:20:00.000Z",
        "resolvedAt": null
      }
    ]
  }
  ```

### 4.2 Update Incident Status
- **Method & Path**: `PATCH /api/incidents`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "id": "inc_4410e2",
    "status": "ACKNOWLEDGED" | "RESOLVED"
  }
  ```
- **Response**: `200 OK`

---

## 5. Reports & Analytics APIs

### 5.1 Workspace SLA & Health Summary
- **Method & Path**: `GET /api/reports`
- **Auth Required**: Yes
- **Description**: Returns 24h, 7d, and 30d uptime statistics, p50/p95/p99 latency percentiles, and incident counts.
- **Response**: `200 OK`

### 5.2 Export SLA Report
- **Method & Path**: `GET /api/reports/export?format=csv` or `GET /api/reports/export?format=json`
- **Auth Required**: Yes
- **Response**: CSV attachment (`text/csv`) or structured JSON document.

---

## 6. SaaS Billing & Subscriptions APIs

### 6.1 Get Active Subscription & Quota
- **Method & Path**: `GET /api/billing/subscription`
- **Auth Required**: Yes
- **Response**: `200 OK`
  ```json
  {
    "subscription": {
      "plan": "PRO",
      "status": "ACTIVE",
      "billingCycle": "MONTHLY",
      "currentPeriodEnd": "2026-12-10T00:00:00.000Z",
      "cancelAtPeriodEnd": false
    },
    "limits": {
      "maxEndpoints": 25,
      "minIntervalSeconds": 30,
      "retentionDays": 30,
      "allowWebhookAlerts": true,
      "allowSlaExport": true
    },
    "usage": {
      "currentEndpoints": 8,
      "remainingEndpoints": 17
    }
  }
  ```

### 6.2 Checkout & Plan Upgrade
- **Method & Path**: `POST /api/billing/checkout`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "plan": "PRO" | "ENTERPRISE",
    "billingCycle": "MONTHLY" | "ANNUAL"
  }
  ```
- **Response**: `200 OK` with checkout session URL or immediate sandbox confirmation.

### 6.3 Cancel & Resume Subscription
- **Method & Path**: `POST /api/billing/cancel`
- **Method & Path**: `POST /api/billing/resume`
- **Auth Required**: Yes
- **Response**: `200 OK`

### 6.4 List Billing Invoices
- **Method & Path**: `GET /api/billing/invoices`
- **Auth Required**: Yes
- **Response**: `200 OK` with invoice items, payment status, amount, and downloadable receipts.

### 6.5 Payment Gateway Webhook
- **Method & Path**: `POST /api/billing/webhook`
- **Auth Required**: No (Verified via `x-signature` HMAC header)
- **Description**: Processes external payment provider lifecycle events (`invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`).
- **Response**: `200 OK` `{ "received": true }`

---

## 7. System Health & Observability APIs

### 7.1 Liveness & Readiness Probes
- **Method & Path**: `GET /api/health`
- **Query Parameter**: `?probe=live` (Liveness) or `?probe=ready` (Deep readiness check)
- **Auth Required**: No (Public monitoring endpoint)
- **Response**: `200 OK` (when healthy) or `503 Service Unavailable`
  ```json
  {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-11-10T14:40:00.000Z",
    "uptime": 86400,
    "services": {
      "database": "connected",
      "redis": "connected"
    },
    "latency": {
      "databaseMs": 2,
      "redisMs": 1
    }
  }
  ```

### 7.2 Prometheus Telemetry Metrics
- **Method & Path**: `GET /api/metrics`
- **Auth Required**: Optional (Configurable via `METRICS_SECRET`)
- **Content-Type**: `text/plain; version=0.0.4; charset=utf-8`
- **Exposed Metrics**:
  - `http_requests_total{method,path,status}`
  - `http_request_duration_seconds{method,path,quantile}`
  - `apiwatch_monitored_endpoints{status}`
  - `apiwatch_db_latency_seconds`
  - `process_cpu_user_seconds_total`
  - `process_resident_memory_bytes`
