# APIWatch — Technical Architecture & Implementation Plan

> **Document**: `TECHNICAL_PLAN.md`  
> **Project**: APIWatch (API Monitoring SaaS)  
> **Development Phase**: Phase 2 — Technical Planning & Architecture  
> **Architecture Pattern**: Modular Monolith + Dedicated Node.js Background Worker  
> **Status**: APPROVED ARCHITECTURE DRAFT  

---

## 1. Executive & Architecture Overview

APIWatch is designed as a **Modular Monolith** with a decoupled background worker architecture. This separation guarantees that continuous endpoint monitoring, automated incident alerting, and periodic health checks run reliably 24/7 without consuming web server resources or depending on user sessions.

### 1.1 Core Components & Boundary

1. **Next.js Web Application (`apps/web` or Root Next.js)**:
   - Presentation Layer: Marketing pages, user authentication (Auth.js), responsive dashboard UI (Tailwind CSS + shadcn/ui + Recharts).
   - Application & REST API Layer: Route Handlers (`/api/...`) providing CRUD operations for workspaces, endpoints, notification settings, manual checks, and metric queries.
   - Enforces authentication, session verification, ownership checks, and input schema validation (Zod).

2. **Node.js Monitoring Worker (`worker`)**:
   - Long-running, state-controlled daemon process executed in a dedicated Node.js runtime.
   - Consumes jobs from Redis via **BullMQ**.
   - Executes safe outbound HTTP/HTTPS health checks with strict SSRF defense, DNS pinning, TLS verification, timeout guarantees, and payload size bounds.
   - Evaluates assertion rules (status codes, headers, body matching), logs execution records into PostgreSQL, updates endpoint state (`UP`, `DOWN`), triggers incident lifecycle transitions, and queues notifications.

3. **Persistent Data Store (PostgreSQL + Prisma ORM)**:
   - Single source of truth for users, workspaces, endpoints, configuration, check histories, incidents, and audit logs.

4. **Queue & Job Scheduling (Redis + BullMQ)**:
   - In-memory data store dedicated to job queues, repeatable schedulers, rate limiting, and ephemeral worker state.
   - Redis does **not** replace PostgreSQL; scheduler definitions in Redis are synchronized from PostgreSQL on worker boot (reconciliation).

5. **Notification Gateway**:
   - Asynchronous worker sub-pipeline processing alert dispatches (SMTP/Email) upon state transitions (`UP` $\leftrightarrow$ `DOWN`).

---

## 2. System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client["User Browser"]
        UI["Web Dashboard / Mobile UI"]
    end

    subgraph WebServer["Next.js App (Presentation & API)"]
        Routes["App Router & Route Handlers (/api/*)"]
        AuthModule["Auth.js & Session Guard"]
        AppServices["Application Services (Endpoint, Workspace, Incident)"]
        QueueClient["BullMQ Queue Producer"]
    end

    subgraph DataStorage["Persistence & Cache"]
        PG[("PostgreSQL\n(Prisma ORM)")]
        RedisQueue[("Redis\n(BullMQ Queues & Schedulers)")]
    end

    subgraph DedicatedWorker["Dedicated Node.js Worker"]
        Reconciliation["Startup Reconciliation"]
        BullWorker["BullMQ Job Processor"]
        MonitoringEngine["Monitoring Engine\n(SSRF Guard + HTTP Client)"]
        AssertionEngine["Response & Assertion Evaluator"]
        IncidentManager["Incident & State Engine"]
        AlertQueueProducer["Alert Queue Dispatcher"]
    end

    subgraph External["External Network"]
        TargetAPI["Target HTTP / HTTPS Endpoints"]
        SMTPServer["Email / Notification Gateway"]
    end

    UI -->|HTTPS / REST| Routes
    Routes --> AuthModule
    AuthModule --> AppServices
    AppServices -->|CRUD & Queries| PG
    AppServices -->|Register / Remove Schedulers| QueueClient
    QueueClient -->|Enqueue Jobs| RedisQueue

    Reconciliation -.->|Fetch active endpoints| PG
    Reconciliation -.->|Sync repeatable jobs| RedisQueue

    RedisQueue -->|Pull Jobs| BullWorker
    BullWorker --> MonitoringEngine
    MonitoringEngine -->|Safe Outbound Request| TargetAPI
    TargetAPI -->|Response / Timeout| MonitoringEngine
    MonitoringEngine --> AssertionEngine
    AssertionEngine -->|Persist Check Result| PG
    AssertionEngine --> IncidentManager
    IncidentManager -->|Update Endpoint Status & Incidents| PG
    IncidentManager -->|Enqueue Alert| AlertQueueProducer
    AlertQueueProducer -->|Notification Job| RedisQueue
    BullWorker -.->|Dispatch Notification| SMTPServer
```

---

## 3. Repository & Folder Structure

To preserve developer velocity while strictly maintaining boundaries, APIWatch adopts a clean modular structure:

```
apiwatch/
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore patterns
├── .prettierrc                       # Prettier configuration
├── .prettierignore                   # Prettier ignore
├── components.json                   # shadcn/ui configuration
├── eslint.config.mjs                 # ESLint flat config
├── next.config.ts                    # Next.js configuration
├── package.json                      # Dependencies and workspace root scripts
├── pnpm-lock.yaml                    # Lockfile
├── tsconfig.json                     # TypeScript compiler configuration
├── README.md                         # Project documentation
├── PROJECT_PRD_AND_PLAYBOOK.md       # Master PRD and execution playbook
├── TECHNICAL_PLAN.md                 # Technical architecture reference (this file)
│
├── prisma/                           # Database Schema & Migrations
│   ├── schema.prisma                 # Master Prisma Schema
│   └── seed.ts                       # Database seeding script
│
├── src/                              # Next.js Application Core
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Authentication routes (login, register)
│   │   ├── (dashboard)/              # Protected dashboard pages
│   │   │   ├── dashboard/
│   │   │   ├── endpoints/
│   │   │   │   ├── new/
│   │   │   │   └── [id]/
│   │   │   ├── incidents/
│   │   │   └── settings/
│   │   ├── api/                      # Next.js REST Route Handlers
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── endpoints/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── pause/route.ts
│   │   │   │       ├── resume/route.ts
│   │   │   │       ├── check/route.ts
│   │   │   │       └── history/route.ts
│   │   │   ├── dashboard/
│   │   │   │   └── summary/route.ts
│   │   │   └── reports/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   │
│   ├── components/                   # UI Components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── dashboard/                # Dashboard overview & widgets
│   │   ├── endpoints/                # Endpoint forms, metrics, tables
│   │   └── layout/                   # Navbar, sidebar, user menus
│   │
│   └── lib/                          # Shared Core Utilities
│       ├── db.ts                     # Prisma client singleton
│       ├── redis.ts                  # Redis connection factory
│       ├── queue.ts                  # BullMQ queues & helper definitions
│       ├── crypto.ts                 # AES-256-GCM encryption/decryption
│       ├── validations/              # Zod schemas (endpoint, auth, config)
│       └── utils.ts                  # Classnames & formatting helpers
│
├── worker/                           # Dedicated Monitoring Engine Worker
│   ├── src/
│   │   ├── config/                   # Worker environment & constants
│   │   ├── engine/                   # Safe HTTP Execution Engine
│   │   │   ├── ssrf-guard.ts         # DNS resolution & IP subnet blocking
│   │   │   ├── http-executor.ts      # Native fetch / undici agent with IP pinning
│   │   │   └── assertions.ts         # Status, header & body assertion logic
│   │   ├── jobs/                     # BullMQ Processors
│   │   │   ├── monitoring.job.ts     # Main endpoint check handler
│   │   │   ├── notification.job.ts   # Alert email dispatcher
│   │   │   └── maintenance.job.ts    # 30-day log purge job
│   │   ├── scheduler/                # BullMQ Repeatable Job Reconciliation
│   │   │   └── reconciler.ts         # Compares DB endpoints vs Redis schedulers
│   │   └── index.ts                  # Worker bootstrap, signal handlers (SIGTERM)
│   ├── package.json                  # Worker-specific scripts or runner
│   └── tsconfig.json
│
└── docker/                           # Production & Development Containers
    ├── Dockerfile.web                # Next.js production build
    ├── Dockerfile.worker             # Node.js worker production build
    └── docker-compose.yml            # PostgreSQL, Redis, Web, Worker
```

---

## 4. Database Schema Design (PostgreSQL + Prisma)

### 4.1 Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ WORKSPACE : owns
    USER ||--o{ ACCOUNT : has
    USER ||--o{ SESSION : has
    WORKSPACE ||--o{ ENDPOINT : contains
    WORKSPACE ||--o{ NOTIFICATION_SETTING : configures
    ENDPOINT ||--|| MONITORING_CONFIGURATION : has
    ENDPOINT ||--o{ MONITORING_CHECK : generates
    ENDPOINT ||--o{ INCIDENT : experiences
    ENDPOINT ||--o| ENDPOINT_DOCUMENTATION : documents
    INCIDENT ||--o{ NOTIFICATION : triggers

    USER {
        string id PK
        string email UK
        string passwordHash
        datetime createdAt
        datetime updatedAt
    }

    WORKSPACE {
        string id PK
        string ownerId FK
        string name
        datetime createdAt
        datetime updatedAt
    }

    ENDPOINT {
        string id PK
        string workspaceId FK
        string name
        string url
        string method
        int intervalSeconds
        int timeoutMs
        string status
        boolean isActive
        int configVersion
        datetime createdAt
        datetime updatedAt
    }

    MONITORING_CONFIGURATION {
        string id PK
        string endpointId FK
        int[] expectedStatusCodes
        string requestHeadersEncrypted
        string requestBody
        string expectedHeaders
        string expectedBodyContains
        string expectedBodyNotContains
        boolean followRedirects
        int maxResponseBytes
    }

    MONITORING_CHECK {
        string id PK
        string endpointId FK
        int statusCode
        float responseTimeMs
        boolean isSuccess
        string status
        string errorCode
        string errorMessage
        json assertionResults
        datetime checkedAt
    }

    INCIDENT {
        string id PK
        string endpointId FK
        string status
        datetime startedAt
        datetime resolvedAt
        string failureReason
    }

    NOTIFICATION_SETTING {
        string id PK
        string workspaceId FK
        string email
        boolean enabled
    }

    NOTIFICATION {
        string id PK
        string incidentId FK
        string type
        string recipient
        string deliveryStatus
        datetime sentAt
    }

    ENDPOINT_DOCUMENTATION {
        string id PK
        string endpointId FK
        string description
        string requestExample
        string responseExample
    }
```

### 4.2 Prisma Schema Specification

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum HttpMethod {
  GET
  POST
  PUT
  PATCH
  DELETE
  HEAD
}

enum EndpointStatus {
  UP
  DOWN
  PAUSED
  PENDING
}

enum CheckStatus {
  SUCCESS
  FAILED
  TIMEOUT
  ERROR
}

enum IncidentStatus {
  OPEN
  RESOLVED
}

enum NotificationDeliveryStatus {
  PENDING
  SENT
  FAILED
}

model User {
  id            String      @id @default(uuid())
  email         String      @unique
  passwordHash  String?
  name          String?
  image         String?
  workspaces    Workspace[]
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Workspace {
  id                   String                @id @default(uuid())
  name                 String
  ownerId              String
  owner                User                  @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  endpoints            Endpoint[]
  notificationSettings NotificationSetting[]
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  @@index([ownerId])
}

model Endpoint {
  id              String                   @id @default(uuid())
  workspaceId     String
  workspace       Workspace                @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name            String
  url             String
  method          HttpMethod               @default(GET)
  intervalSeconds Int                      @default(300) // Default 5 mins
  timeoutMs       Int                      @default(10000) // Default 10s
  status          EndpointStatus           @default(PENDING)
  isActive        Boolean                  @default(true)
  configVersion   Int                      @default(1)
  config          MonitoringConfiguration?
  checks          MonitoringCheck[]
  incidents       Incident[]
  documentation   EndpointDocumentation?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@index([workspaceId])
  @@index([isActive])
}

model MonitoringConfiguration {
  id                      String   @id @default(uuid())
  endpointId              String   @unique
  endpoint                Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  expectedStatusCodes     Int[]    @default([200])
  requestHeadersEncrypted String?  @db.Text // AES-256-GCM encrypted JSON
  requestBody             String?  @db.Text
  expectedHeaders         Json?    // Key-value pairs to validate
  expectedBodyContains    String?  @db.Text
  expectedBodyNotContains String?  @db.Text
  followRedirects         Boolean  @default(false)
  maxResponseBytes        Int      @default(1048576) // 1 MB limit
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

model MonitoringCheck {
  id               String      @id @default(uuid())
  endpointId       String
  endpoint         Endpoint    @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  statusCode       Int?
  responseTimeMs   Float?
  isSuccess        Boolean
  status           CheckStatus
  errorCode        String?     // e.g. SSRF_BLOCKED, TIMEOUT, HTTP_STATUS_MISMATCH
  errorMessage     String?
  assertionResults Json?       // Detail of checks passed/failed
  checkedAt        DateTime    @default(now())

  @@index([endpointId, checkedAt(sort: Desc)])
  @@index([checkedAt])
}

model Incident {
  id            String         @id @default(uuid())
  endpointId    String
  endpoint      Endpoint       @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  status        IncidentStatus @default(OPEN)
  startedAt     DateTime       @default(now())
  resolvedAt    DateTime?
  failureReason String?
  notifications Notification[]

  @@index([endpointId, status])
}

model NotificationSetting {
  id          String    @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  email       String
  enabled     Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId])
}

model Notification {
  id             String                     @id @default(uuid())
  incidentId     String
  incident       Incident                   @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  type           String                     @default("EMAIL")
  recipient      String
  deliveryStatus NotificationDeliveryStatus @default(PENDING)
  sentAt         DateTime?
  createdAt      DateTime                   @default(now())

  @@index([incidentId])
  @@index([deliveryStatus])
}

model EndpointDocumentation {
  id              String   @id @default(uuid())
  endpointId      String   @unique
  endpoint        Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  description     String?  @db.Text
  requestExample  String?  @db.Text
  responseExample String?  @db.Text
  updatedAt       DateTime @updatedAt
}
```

---

## 5. BullMQ & Scheduler Architecture

### 5.1 Queues

| Queue Name | Purpose | Concurrency | Retry Strategy |
| :--- | :--- | :--- | :--- |
| `monitoring-queue` | Executes HTTP monitoring checks | 20 workers | 0 automatic retries for target errors |
| `notification-queue` | Dispatches incident emails | 5 workers | 3 retries with exponential backoff |
| `maintenance-queue` | Data retention cleanup (30-day purge) | 1 worker | 1 retry |

### 5.2 Deterministic Repeatable Job IDs
To prevent duplicate schedules in Redis, every scheduled recurring job uses a deterministic ID:
`monitoring:schedule:{endpointId}`

- **Create/Update**:
  ```ts
  await monitoringQueue.add(
    "execute-check",
    { endpointId, configVersion },
    {
      jobId: `manual:${endpointId}:${Date.now()}`, // for ad-hoc checks
      repeat: {
        pattern: undefined,
        every: intervalSeconds * 1000,
        jobId: `repeat:${endpointId}`,
      },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
  ```
- **Pause/Delete**:
  ```ts
  await monitoringQueue.removeRepeatableByKey(repeatableKey);
  ```

### 5.3 Startup Reconciliation Pattern
When the Node.js Worker process boots:
1. Queries PostgreSQL for all `Endpoint` records where `isActive: true` and `status != 'PAUSED'`.
2. Fetches all existing repeatable jobs in BullMQ.
3. Diff:
   - Removes orphaned jobs in Redis not present or inactive in DB.
   - Adds/updates jobs missing from Redis or with mismatched interval configs.
4. Prevents Redis state drift during downtime or restarts.

---

## 6. HTTP Monitoring Engine & SSRF Security

### 6.1 Strict SSRF Protection Flow

Because users input arbitrary URLs to be fetched by the server, strict anti-SSRF protections are required:

```mermaid
flowchart TD
    Start["Receive Target URL"] --> ParseURL["URL Parser (Validate Protocol: http / https)"]
    ParseURL -->|Invalid Scheme| Reject["Reject: INVALID_CONFIGURATION"]
    ParseURL -->|Valid| ResolveDNS["DNS Resolution (dns.promises.lookup - all records)"]
    ResolveDNS -->|Resolution Failure| RejectDNS["Reject: DNS_ERROR"]
    ResolveDNS --> SubnetCheck{"Check Each IP against Blocked Subnets"}

    SubnetCheck -->|Match: 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, ::1, Cloud Metadata| BlockSSRF["Reject: SSRF_BLOCKED"]
    SubnetCheck -->|All IPs Public| PinConnection["Pin Connection to Resolved Public IP"]

    PinConnection --> ExecuteRequest["Execute HTTP Request with Timeout (e.g. 10s)"]
    ExecuteRequest --> CheckRedirect{"Redirect Received (3xx)?"}

    CheckRedirect -->|No| ProcessResponse["Read Body (Max 1MB) & Run Assertions"]
    CheckRedirect -->|Yes and followRedirects=true| VerifyRedirectCount{"Redirect Count < 3?"}
    CheckRedirect -->|Yes and followRedirects=false| ProcessResponse

    VerifyRedirectCount -->|Exceeded| FailRedirect["Reject: SSRF_BLOCKED / MAX_REDIRECTS"]
    VerifyRedirectCount -->|OK| RevalidateTarget["Strip Auth Header & Re-run DNS/Subnet Check on New Location"]
    RevalidateTarget --> SubnetCheck
```

### 6.2 Blocked IP Subnets & Ranges
- `0.0.0.0/8`
- `10.0.0.0/8` (Private network)
- `100.64.0.0/10` (Carrier-grade NAT)
- `127.0.0.0/8` (Loopback)
- `169.254.0.0/16` (Link-local / Cloud Metadata `169.254.169.254`)
- `172.16.0.0/12` (Private network)
- `192.0.0.0/24` (IETF protocol assignments)
- `192.0.2.0/24` (TEST-NET-1)
- `192.88.99.0/24` (6to4 Relay)
- `192.168.0.0/16` (Private network)
- `198.18.0.0/15` (Benchmarking)
- `198.51.100.0/24` (TEST-NET-2)
- `203.0.113.0/24` (TEST-NET-3)
- `224.0.0.0/4` (Multicast)
- `240.0.0.0/4` (Reserved)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 Unique Local)
- `fe80::/10` (IPv6 Link Local)
- `::ffff:0:0/96` (IPv4-mapped IPv6 translated to above)

### 6.3 DNS Pinning & Connection Binding
To defeat DNS Rebinding attacks (where a hostname initially resolves to a public IP during pre-check, but returns `127.0.0.1` when `fetch` actually connects):
- Worker uses custom Node.js `undici.Agent` / `http.Agent` with `lookup` hook or pre-resolved IP connection socket dispatching `Host: <domain>` header.

### 6.4 Credential Encryption (AES-256-GCM)
Sensitive headers (e.g., `Authorization: Bearer <token>`, `X-Api-Key`) are never saved in cleartext:
- **Algorithm**: `aes-256-gcm`
- **Key Source**: 32-byte hexadecimal string loaded via `ENCRYPTION_KEY` environment variable.
- **Payload Format**: `iv:authTag:encryptedText` (all hex or base64 encoded).
- Decrypted exclusively in-memory inside the Worker during check execution.

---

## 7. REST API Contracts & Specifications

All API routes follow standard JSON envelopes:
- **Success Envelope**: `{ "success": true, "data": ... }`
- **Error Envelope**: `{ "success": false, "error": { "code": string, "message": string, "details": any } }`

### 7.1 Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource created.
- `400 Bad Request`: Validation failure (Zod error details).
- `401 Unauthorized`: Missing or invalid session.
- `403 Forbidden`: Workspace or resource ownership mismatch.
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unhandled application error.

### 7.2 Core Endpoints Matrix

| Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/endpoints` | List all endpoints for active workspace | Yes |
| `POST` | `/api/endpoints` | Create a new endpoint & register schedule | Yes |
| `GET` | `/api/endpoints/:id` | Fetch endpoint details, configuration & latest stats | Yes |
| `PATCH` | `/api/endpoints/:id` | Update endpoint settings & sync schedule | Yes |
| `DELETE` | `/api/endpoints/:id` | Soft/hard delete endpoint & remove schedule | Yes |
| `POST` | `/api/endpoints/:id/pause` | Pause monitoring | Yes |
| `POST` | `/api/endpoints/:id/resume` | Resume monitoring | Yes |
| `POST` | `/api/endpoints/:id/check` | Ad-hoc manual check trigger | Yes |
| `GET` | `/api/endpoints/:id/history` | Paginated check history with filters | Yes |
| `GET` | `/api/dashboard/summary` | Aggregate metrics (total, UP, DOWN, avg response time) | Yes |

---

## 8. Deployment Architecture (Docker & VPS)

### 8.1 Docker Compose Topology

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    restart: always
    environment:
      - DATABASE_URL=postgresql://apiwatch:secret@postgres:5432/apiwatch_db
      - REDIS_URL=redis://redis:6379
      - AUTH_SECRET=${AUTH_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - NEXTAUTH_URL=${APP_URL}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - internal-net

  worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    restart: always
    environment:
      - DATABASE_URL=postgresql://apiwatch:secret@postgres:5432/apiwatch_db
      - REDIS_URL=redis://redis:6379
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - internal-net
      - egress-net # Outbound internet only

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: apiwatch
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: apiwatch_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - internal-net

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    networks:
      - internal-net

networks:
  internal-net:
    internal: true
  egress-net:
    driver: bridge

volumes:
  pgdata:
  redisdata:
```

---

## 9. Dependency Manifest & Rationale

| Package | Classification | Version Target | Rationale |
| :--- | :--- | :--- | :--- |
| `next` | Production | `16.4.x` | Modern App Router, Server Components & Route Handlers |
| `react` / `react-dom`| Production | `19.3.x` | UI framework bundled with Next.js |
| `tailwindcss` | Production | `4.3.x` | Utility-first CSS styling |
| `shadcn/ui` (primitives) | Production | Latest | Accessible, headless, tailwind-styled UI components |
| `zod` | Production | `4.6.x` / `3.x` | Type-safe schema validation across API and forms |
| `lucide-react` | Production | Latest | Lightweight icons |
| `recharts` | Production | Latest | Responsive metric and latency charts |
| `date-fns` | Production | Latest | Timestamp and relative time formatting |
| `prisma` / `@prisma/client` | Planned (Phase 6) | `^6.4.0` | Type-safe PostgreSQL ORM & migration engine |
| `bullmq` | Planned (Phase 6) | `^5.40.0` / `^6.x` | Redis-backed job scheduling and worker queue |
| `ioredis` | Planned (Phase 6) | `^5.4.0` | High-performance Redis client for BullMQ |
| `next-auth` (Auth.js) | Planned (Phase 6) | `^5.0.0-beta` | Authentication and session cookies |
| `nodemailer` | Planned (Phase 8) | `^6.9.0` | Transactional email delivery for alerts |
| `vitest` | Planned (Phase 9) | `^3.x` | Fast unit testing for validation and SSRF logic |

---

## 10. Technical Risk Register

| ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **TR-01** | SSRF attack accessing internal VPS services or cloud metadata (`169.254.169.254`). | **Critical** | High | Multi-stage SSRF pipeline: Protocol check $\rightarrow$ DNS resolution $\rightarrow$ Subnet banlist $\rightarrow$ IP Pinning $\rightarrow$ Safe agent $\rightarrow$ Egress network isolation. |
| **TR-02** | DNS Rebinding bypassing pre-request DNS check. | **High** | Medium | Connect directly to the validated IP address while supplying original `Host` header via custom HTTP agent. |
| **TR-03** | Scheduler drift between PostgreSQL and Redis after worker crash. | **Medium** | Medium | Implement startup reconciliation on Worker launch to re-sync active DB endpoints with BullMQ repeatable schedulers. |
| **TR-04** | Stolen credentials stored in endpoint custom headers. | **High** | Low | Encrypt headers at rest using `AES-256-GCM`. Redact sensitive values from logs, dashboard APIs, and client-side payloads. |
| **TR-05** | High-volume monitoring checks overwhelming PostgreSQL disk space. | **Medium** | High | Implement 30-day data retention policy purged via daily automated maintenance job; composite indexes on `(endpointId, checkedAt DESC)`. |
| **TR-06** | Outbound check hanging indefinitely on unresponsive servers. | **Medium** | High | Enforce strict request timeout (default 10s, max 30s) using `AbortController` signal and response size caps (max 1 MB). |

---

## 11. Approval & Transition to Phase 3

- **Phase 2 Status**: COMPLETED
- **Next Phase**: **PHASE 3 — UI/UX Planning & Design System**
