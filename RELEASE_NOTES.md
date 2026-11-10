# APIWatch Release Notes — v2.0.0 (Production LTS)

**Release Version**: v2.0.0  
**Release Date**: November 2026  
**Status**: General Availability (Production Long-Term Support)

---

## 1. Executive Summary

We are proud to announce the production release of **APIWatch v2.0.0**, an enterprise-grade API monitoring and outage alerting platform built with a high-performance **modular monolith** web application and decoupled **BullMQ** worker daemon.

v2.0.0 represents the culmination of a 10-phase engineering lifecycle covering full UX/UI redesign, advanced endpoint operations, defense-in-depth security hardening, multi-layer query and cache performance optimization, full SaaS billing infrastructure, deep observability and APM telemetry, and end-to-end production readiness.

---

## 2. Highlights of What's New in v2.0.0

### 🚀 Production Architecture & Observability
- **Prometheus Telemetry (`/api/metrics`)**: Built-in Prometheus exporter serving HTTP request rates, p50/p95/p99 latencies, database ping times, and process memory/CPU consumption.
- **Deep Health Probes (`/api/health?probe=ready|live`)**: Orchestrator-compatible liveness and readiness checks validating live PostgreSQL and Redis latencies.
- **Structured JSON Logging**: Zero-dependency structured JSON logger with automatic PII sanitization (redacting passwords, tokens, API keys, and authorization headers).
- **Runtime Error Tracker**: Exception fingerprinting with in-memory breadcrumbs and automated system alerts.
- **Automated Backup & Restore**: Robust backup scripts (`scripts/backup.sh`, `scripts/restore.sh`, `scripts/backup-db.sh`) with SHA-256 integrity checksums, automated rotation, and S3 replication capabilities.

### 💼 SaaS Business Infrastructure
- **Tiered Quota Enforcement**: Free Starter (5 endpoints, 5m checks), Pro (25 endpoints, 30s checks), and Enterprise tiers managed via `UsageLimitsService`.
- **14-Day Free Pro Trial**: Automatically provisions a 14-day Pro trial upon workspace registration without requiring a credit card.
- **SaaS Billing Engine**: Integrated checkout flow, automated PDF/HTML invoice generation, subscription cancellation/resumption, and HMAC-verified payment webhooks.
- **Interactive Pricing Page (`/pricing`)**: Feature comparison matrix with monthly/annual billing cycle toggle and direct checkout triggers.
- **Onboarding Wizard**: Guided first-run checklist taking new users from endpoint creation to alert configuration.

### 🛡️ Enterprise-Grade Security
- **Multi-Layer SSRF Defense**: Dynamic DNS resolution blocking RFC 1918 private ranges, AWS/GCP cloud metadata (`169.254.169.254`), IPv6 loopback, and local socket probes.
- **Sliding Window Rate Limiter**: 60 requests/minute per client with sliding window tracking to prevent API abuse.
- **Cryptographic Protection**: AES-256-GCM authenticated encryption for database credentials and tokens; 12-round bcrypt password hashing with constant-time HMAC session token validation.
- **Automated Security Headers**: Enforced HSTS (`max-age=63072000`), CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), and Permissions-Policy.

### ⚡ Performance & Reliability
- **Dual-Layer Cache**: In-memory LRU + Redis caching layer for instant telemetry retrieval.
- **Optimized Composite DB Indexes**: High-performance indexes on `CheckResult(endpointId, checkedAt)`, `Incident(workspaceId, status)`, and `Endpoint(workspaceId, isPaused)`.
- **Lean Database Projections**: Query select scoping eliminating large payloads and unneeded columns.
- **Dynamic Component Imports**: Client bundle footprint minimized via dynamic imports and DOM pagination.

### 🎨 Modernized User Experience
- **Command Palette (`Cmd+K` / `Ctrl+K`)**: Rapid navigation and global actions across endpoints, incidents, settings, and documentation.
- **Bulk Operations**: Multi-select endpoints to pause, resume, or delete simultaneously.
- **Multi-Sorting & Search**: Instant client-side search, filtering by status/method, and multi-field table sorting.
- **SLA Export**: CWE-1236 safe CSV and JSON export with automatic spreadsheet injection sanitization.

### 🌐 SEO, Social & Accessibility
- **Dynamic Open Graph Images (`src/app/opengraph-image.tsx`)**: High-resolution 1200x630 social sharing banners generated via `@vercel/og`.
- **Sitemap & Robots**: Clean sitemap index and crawler rules isolating private workspace dashboards.
- **Full Keyboard Navigation & ARIA**: Screen-reader friendly semantic structure with explicit accessibility labels.

---

## 3. Verification & Test Metrics

- **Automated Tests**: **134/134 Tests Passing (100% Pass Rate)** across 25 suites in 1.44s.
- **Test Categories**: Unit, Integration, API, E2E Workflow, UI Rendering, Auth/RBAC, and Edge Cases.
- **Security Audit**: **0 Vulnerabilities** reported via `pnpm audit --prod`.
- **Static Analysis**: **0 TypeScript errors & 0 ESLint warnings**.
- **Next.js Production Build**: **43 Routes compiled and optimized** with Turbopack and Partial Prerendering.

---

## 4. Production Documentation Directory

- 📖 [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) — Comprehensive REST API reference.
- 🚀 [`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md) — Pre-flight audit matrix and smoke testing checklist.
- 🗄️ [`docs/DATABASE_MIGRATION_GUIDE.md`](./docs/DATABASE_MIGRATION_GUIDE.md) — Production database migration and zero-downtime evolution.
- ⚙️ [`docs/ENVIRONMENT_CONFIGURATION.md`](./docs/ENVIRONMENT_CONFIGURATION.md) — Environment variables and cryptographic secrets reference.
- 🔄 [`docs/ROLLBACK_STRATEGY.md`](./docs/ROLLBACK_STRATEGY.md) — Emergency rollback playbooks and disaster recovery runbooks.
- 📊 [`docs/POST_LAUNCH_MONITORING.md`](./docs/POST_LAUNCH_MONITORING.md) — Day 0–14 observability and Prometheus alerting rules.
- 🗺️ [`docs/PRODUCT_ROADMAP.md`](./docs/PRODUCT_ROADMAP.md) — Future product roadmap (Phases 11–16).
- 🚢 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — VPS Ubuntu deployment with Docker Compose & Caddy TLS.
