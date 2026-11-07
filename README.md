# APIWatch — API Monitoring Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748.svg)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-6.7-red.svg)](https://bullmq.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-38%20Passed-brightgreen.svg)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/SSRF%20Guard-Protected-green.svg)](#security-architecture)

**APIWatch** is an enterprise-grade API monitoring SaaS platform designed to monitor HTTP/HTTPS endpoints, track response times and uptime SLA, execute deep response assertions, manage incidents, and publish public status boards.

---

## 🏗️ Architecture

APIWatch adopts a high-efficiency **modular monolith** web application architecture paired with a decoupled, continuous background worker:

```
[ Clients / Browsers ]
        │
        ▼ (Port 80/443)
┌──────────────────────────────────────────┐
│ Reverse Proxy (Caddy 2)                  │
│ Automatic HTTPS / Let's Encrypt / HSTS   │
└────────────────────┬─────────────────────┘
                     │ (Internal Bridge Network)
       ┌─────────────┴─────────────┐
       ▼ (Port 3000)               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ Next.js 16 Web App       │   │ BullMQ Monitoring Worker │
│ - Dashboard UI           │   │ - HTTP Check Executor    │
│ - REST Route Handlers    │   │ - SSRF Sandbox Guard     │
│ - Stateless Auth (HMAC)  │   │ - Alert Dispatcher       │
└────────────┬─────────────┘   └────────────┬─────────────┘
             │                              │
      ┌──────┴───────────────┐   ┌──────────┴────────┐
      ▼                      ▼   ▼                   ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│ PostgreSQL 16 Alpine     │   │ Redis 7 Alpine           │
│ - Multi-tenant DB        │   │ - BullMQ Repeatable Jobs │
│ - Internal Network Only  │   │ - Password Protected     │
└──────────────────────────┘   └──────────────────────────┘
```

---

## ✨ Features

- **Multi-Method Monitoring**: Support for `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, and `HEAD`.
- **Flexible Scheduling**: Automated intervals from 1 minute to 60 minutes.
- **Deep Assertions**: Match HTTP status codes, latency thresholds (< ms), response headers, and response body JSON/substrings.
- **Incident Lifecycle Management**: Automatic incident detection (`OPEN` → `ACKNOWLEDGED` → `RESOLVED`) with email alerts.
- **Visual Telemetry**: Interactive latency charts via Recharts, status badges, and SLA calculations.
- **Public Status Page**: Dedicated public availability page at `/status` for transparent stakeholder communication.
- **SLA & Audit Reporting**: Availability statistics over 24h, 7d, 30d, 90d with CWE-1236 sanitized CSV exports.
- **Zero-Trust Security**: Built-in SSRF sandbox protection, AES-256-GCM encrypted headers, and tamper-proof HMAC sessions.

---

## 🔒 Security Architecture

| Security Domain | Implementation | Guarantee |
| :--- | :--- | :--- |
| **SSRF Defense** | `src/lib/monitoring/ssrf-guard.ts` | Resolves target hostnames against DNS and blocks private networks (RFC 1918), loopback (`127.0.0.1`), link-local metadata (`169.254.169.254`), and non-HTTP protocols. |
| **Data Encryption** | `src/lib/crypto.ts` | Stored authorization tokens and custom headers are encrypted using **AES-256-GCM** with authenticated checksums. |
| **CSV Injection Mitigation** | `src/lib/csv.ts` | Neutralizes CWE-1236 formula injection in spreadsheet exports by prepending `'` to sensitive formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`). |
| **Session Authentication** | `src/lib/auth/session.ts` | Stateless session cookies secured with HMAC-SHA256 signatures, `HttpOnly`, `SameSite=Lax`, and `Secure` attributes. |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 20 LTS (Recommended: v22 LTS)
- pnpm >= 9 (Recommended: v10+)
- PostgreSQL 16 & Redis 7 (or run via Docker)

### Installation
```bash
# 1. Clone repository
git clone https://github.com/your-org/apiwatch.git
cd apiwatch

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local

# 4. Generate Prisma Client & Run Migrations
pnpm prisma generate
pnpm prisma migrate dev

# 5. Start Development Server
pnpm dev

# 6. (In separate terminal) Start Background Monitoring Worker
pnpm worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Production Deployment (Docker Compose)

APIWatch is packaged for single-command production deployment on Ubuntu VPS with Docker Compose and Caddy automatic HTTPS.

```bash
# 1. Copy production environment file and fill secrets
cp .env.production.example .env

# 2. Build and start all services
docker compose up -d --build

# 3. Verify health
docker compose ps
docker compose logs -f
```

For complete instructions regarding DNS setup, Let's Encrypt certificates, daily automated backups, zero-downtime rolling updates, and disaster recovery, refer to [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).

---

## 🧪 Testing & Verification

Run the automated test suite:

```bash
# Unit & Integration Tests (Vitest)
pnpm test

# Static Type Checking
pnpm exec tsc --noEmit

# Code Quality & Linter
pnpm lint

# Production Build Verification
pnpm build
```

---

## 📚 Project Documentation

- [`PROJECT_PRD_AND_PLAYBOOK.md`](./PROJECT_PRD_AND_PLAYBOOK.md) — 10-phase master development specification.
- [`TECHNICAL_PLAN.md`](./TECHNICAL_PLAN.md) — Technical blueprint, schema design, and queue mechanics.
- [`UI_UX_GUIDE.md`](./UI_UX_GUIDE.md) — Design tokens, color palette, and component specifications.
- [`TEST_REPORT.md`](./TEST_REPORT.md) — Phase 9 QA, security audit, and test execution report.
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — Phase 10 production operations and disaster recovery manual.
- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) — v1.0.0 General Availability release notes.

---

## 📄 License

Proprietary / Private — APIWatch Core MVP Release.
