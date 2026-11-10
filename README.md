# 🛰️ APIWatch — Real-time API Monitoring Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-000000.svg?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.19-2D3748.svg?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-6.7-CC292B.svg?logo=bull&logoColor=white)](https://bullmq.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Caddy](https://img.shields.io/badge/Caddy-2-22B573.svg?logo=caddy&logoColor=white)](https://caddyserver.com/)
[![Vitest](https://img.shields.io/badge/Tests-134%20Passed-brightgreen.svg?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Security](https://img.shields.io/badge/SSRF%20Guard-Zero%20Trust-success.svg)](#-arsitektur-keamanan--hardening)
[![Prometheus](https://img.shields.io/badge/Metrics-Prometheus%20APM-E6522C.svg?logo=prometheus&logoColor=white)](./docs/API_DOCUMENTATION.md#7-system-health--observability-apis)
[![SaaS](https://img.shields.io/badge/SaaS-Free%20%2F%20Pro%20Tier-blue.svg)](./src/app/pricing/page.tsx)

**APIWatch** adalah platform SaaS pemantauan API (*API Monitoring*) modern berbasis arsitektur **modular monolith** dengan background worker decoupled. Dirancang untuk developer dan tim engineering dalam mengawasi performa, ketersediaan (*uptime SLA*), validasi respon (*deep assertions*), penanganan siklus insiden, serta publikasi papan status (*status page*) secara real-time dan aman.

---

## 📑 Daftar Isi

- [Tentang APIWatch](#-tentang-apiwatch)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Fitur Utama](#-fitur-utama)
- [Arsitektur Keamanan & Hardening](#-arsitektur-keamanan--hardening)
- [Tech Stack](#-tech-stack)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Instalasi & Menjalankan Lokal](#-panduan-instalasi--menjalankan-lokal)
- [Panduan Deployment Produksi (Docker Compose)](#-panduan-deployment-produksi-docker-compose)
- [Referensi REST API](#-referensi-rest-api)
- [Pengujian & Verifikasi Kualitas](#-pengujian--verifikasi-kualitas)
- [Dokumentasi Lengkap](#-dokumentasi-lengkap)
- [Lisensi](#-lisensi)

---

## 💡 Tentang APIWatch

Ketergantungan terhadap integritas dan kecepatan API semakin tinggi. Seringkali kegagalan API baru diketahui setelah ada keluhan dari pengguna akhir. 

**APIWatch** mengatasi masalah ini dengan:
1. **Automated Probing**: Menjalankan pengecekan kesehatan API berkala (1 hingga 60 menit) dengan penanganan timeout, header custom, dan autentikasi.
2. **Deep Assertion Engine**: Tidak hanya mengecek status HTTP 200, melainkan mencocokkan range status, batas toleransi latensi (< ms), header wajib, serta pencocokan JSON path atau potongan kata pada body respon.
3. **Automated Incident Lifecycle**: Membuka insiden otomatis saat terdeteksi kegagalan beruntun, mencatat timeline, dan mengirimkan email pemberitahuan ke tim.
4. **Public Trust**: Menyediakan halaman status publik (`/status`) yang independen agar pelanggan dan stakeholder dapat melihat uptime layanan tanpa harus login.

---

## 🏗️ Arsitektur Sistem

APIWatch dibangun dengan filosofi **Modular Monolith**: satu codebase terpadu yang memisahkan tanggung jawab web/API dengan eksekusi monitoring berat via background queue.

```
[ Internet / Browsers / Stakeholders ]
                  │
                  ▼ (Port 80 / 443)
┌────────────────────────────────────────────────────────┐
│  Reverse Proxy: Caddy 2                                │
│  - Otomatisasi Sertifikat SSL/TLS (Let's Encrypt)      │
│  - Enforce HTTPS & Header Keamanan (HSTS, CSP, Sniff)  │
│  - Gzip & Zstandard Compression                        │
└──────────────────────────┬─────────────────────────────┘
                           │ (Internal Docker Bridge Network)
         ┌─────────────────┴─────────────────┐
         ▼ (Port 3000)                       ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ Next.js 16 Web App      │       │ BullMQ Dedicated Worker │
│ - Dashboard UI (React19)│       │ - HTTP Check Executor   │
│ - REST API Handlers     │       │ - SSRF Sandbox Guard    │
│ - Stateless Auth (HMAC) │       │ - Incident Detector     │
│ - Public Status Page    │       │ - Email Alert Dispatcher│
└───────────┬─────────────┘       └───────────┬─────────────┘
            │                                 │
     ┌──────┴──────────────┐   ┌──────────────┴──────┐
     ▼                     ▼   ▼                     ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ PostgreSQL 16 Alpine    │     │ Redis 7 Alpine          │
│ - Database Multi-tenant │     │ - BullMQ Job Queue      │
│ - Volume Persisten      │     │ - Repeatable Scheduler  │
│ - Jaringan Internal     │     │ - Proteksi Password     │
└─────────────────────────┘     └─────────────────────────┘
```

---

## ✨ Fitur Utama

- 🌐 **Multi-Method Probing**: Mendukung HTTP method `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, dan `HEAD`.
- ⏱️ **Jadwal Monitoring Fleksibel**: Interval otomatis setiap 1 menit, 5 menit, 15 menit, 30 menit, hingga 60 menit.
- ⚡ **On-Demand "Check Now"**: Tombol diagnostik langsung untuk memicu pengecekan seketika tanpa menunggu jadwal cron.
- 🎯 **Assertion Engine Multi-Kriteria**:
  - Validasi Status Code (misal: `200`, `2xx`, `200-204`).
  - Ambang Batas Latensi (misal: gagal jika respon > `800ms`).
  - Header Validation (verifikasi keberadaan header `content-type`, `authorization`, dsb).
  - Body Content Validation (pencocokan kata kunci atau struktur JSON).
- 🚨 **Incident Management**:
  - Siklus status insiden lengkap: `OPEN` ➡️ `ACKNOWLEDGED` ➡️ `RESOLVED`.
  - Notifikasi email otomatis via SMTP saat insiden terjadi dan saat pulih (*resolved*).
- 📊 **Telemetri Visual**: Grafik respon interaktif via **Recharts**, kalkulasi persentase ketersediaan (*uptime SLA*), dan breakdown kode status.
- 📢 **Public Status Board (`/status`)**: Halaman ketersediaan publik yang aman diakses publik tanpa login untuk transparansi SLA.
- 📄 **Dokumentasi API Interaktif**: Generator dokumentasi endpoint otomatis (`/api/endpoints/[id]/docs`) untuk integrasi tim.
- 📥 **Laporan & Ekspor Data**: Rekap SLA periode 24 jam, 7 hari, 30 hari, dan 90 hari dengan fasilitas ekspor CSV.

---

## 🔒 Arsitektur Keamanan & Hardening

APIWatch menerapkan prinsip **Defense in Depth**:

| Vektor Keamanan | Implementasi | Mekanisme Perlindungan |
| :--- | :--- | :--- |
| **SSRF (Server-Side Request Forgery)** | [`src/lib/monitoring/ssrf-guard.ts`](file:///d:/10Project/14-OrderInbox/src/lib/monitoring/ssrf-guard.ts) | Resolusi DNS awal dan pencegahan koneksi ke IP privat (RFC 1918), loopback (`127.0.0.1`, `::1`), link-local cloud metadata (`169.254.169.254`), serta pemblokiran protokol non-HTTP (`file://`, `ftp://`, `gopher://`). |
| **Enkripsi Data Sensitif** | [`src/lib/crypto.ts`](file:///d:/10Project/14-OrderInbox/src/lib/crypto.ts) | Token autentikasi, bearer token, dan custom header terenkripsi di database menggunakan algoritma **AES-256-GCM** dengan checksum autentikasi. |
| **CWE-1236 Formula Injection** | [`src/lib/csv.ts`](file:///d:/10Project/14-OrderInbox/src/lib/csv.ts) | Menetralisir eksploitasi CSV injection pada spreadsheet dengan menambahkan prefiks tanda petik tunggal (`'`) pada sel yang diawali karakter formula (`=`, `+`, `-`, `@`, `\t`, `\r`). |
| **Stateless Cookie Session** | [`src/lib/auth/session.ts`](file:///d:/10Project/14-OrderInbox/src/lib/auth/session.ts) | Token sesi ditandatangani menggunakan SHA-256 HMAC untuk mencegah manipulasi, dikirim dengan atribut `HttpOnly`, `SameSite=Lax`, dan `Secure`. |
| **Isolasi Database & Redis** | [`docker-compose.yml`](file:///d:/10Project/14-OrderInbox/docker-compose.yml) | Port PostgreSQL (5432) dan Redis (6379) hanya dibuka pada internal bridge network container dan **tidak pernah dipublikasikan ke internet terbuka**. |

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (Turbopack, App Router, React 19)
- **Styling**: Tailwind CSS v4 & shadcn/ui
- **Icons & Charts**: Lucide React & Recharts
- **Form & Validation**: React Hook Form & Zod

### Backend & Monitoring Engine
- **Runtime**: Node.js 20+ LTS / TypeScript 5
- **ORM & Database**: Prisma ORM & PostgreSQL 16
- **Antrean Pekerjaan**: BullMQ & Redis 7
- **Transmisi Email**: Nodemailer (SMTP / transactional provider)

### DevOps & Infrastruktur
- **Kontainerisasi**: Docker Engine & Docker Compose (Multi-stage Alpine builds)
- **Web Server / Proxy**: Caddy 2 (Automatic TLS Let's Encrypt & HSTS)
- **Testing**: Vitest (Unit & Integration tests)
- **Code Quality**: ESLint 9 & TypeScript Strict Mode

---

## 📂 Struktur Direktori

```
apiwatch/
├── .github/                     # Workflow CI/CD (jika ada)
├── prisma/
│   ├── schema.prisma            # Skema database PostgreSQL
│   └── migrations/              # Riwayat migrasi Prisma
├── public/                      # Aset statis & logo
├── scripts/
│   ├── backup.sh                # Skrip backup database harian terkompresi
│   └── restore.sh               # Skrip pemulihan database
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Halaman Login & Register
│   │   ├── (dashboard)/         # Halaman Dashboard, Endpoints, Incidents, Reports, Settings
│   │   ├── api/                 # REST Route Handlers (/auth, /endpoints, /health, /reports, dsb)
│   │   ├── status/              # Public Status Page
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── endpoints/           # Latency chart, assertion builder, form endpoint
│   │   ├── layout/              # App sidebar, header, navigation
│   │   ├── shared/              # Status badges, empty states, error fallbacks
│   │   └── ui/                  # Komponen basis shadcn/ui
│   └── lib/
│       ├── auth/                # Stateless session & password hashing
│       ├── monitoring/          # SSRF guard, HTTP executor, assertion evaluator
│       ├── queue/               # Koneksi Redis & BullMQ job scheduler
│       ├── services/            # EndpointService, MonitoringService, DashboardService
│       ├── crypto.ts            # Enkripsi AES-256-GCM
│       ├── csv.ts               # Sanitasi CSV formula injection
│       └── db.ts                # Prisma database singleton client
├── worker/
│   └── src/
│       └── index.ts             # Dedicated background worker daemon
├── .dockerignore                # Filter build Docker
├── .env.example                 # Template environment development
├── .env.production.example      # Template environment production
├── Caddyfile                    # Konfigurasi reverse proxy & HTTPS
├── DEPLOYMENT_GUIDE.md          # Panduan operasional & deployment VPS
├── Dockerfile                   # Multi-stage Dockerfile Next.js
├── Dockerfile.worker            # Dockerfile background worker
├── docker-compose.yml           # Orkestrasi multi-container
├── PROJECT_PRD_AND_PLAYBOOK.md  # Dokumen spesifikasi 10 phase
├── RELEASE_NOTES.md             # Catatan rilis v1.0.0
├── TECHNICAL_PLAN.md            # Cetak biru arsitektur
├── TEST_REPORT.md               # Laporan pengujian Phase 9
└── UI_UX_GUIDE.md               # Panduan desain UI/UX
```

---

## 💻 Panduan Instalasi & Menjalankan Lokal

### Prasyarat Sistem
- **Node.js**: >= 20.0.0 LTS (Direkomendasikan Node.js 22 LTS)
- **pnpm**: >= 9.0.0 (Direkomendasikan pnpm 10+)
- **PostgreSQL**: Versi 15 atau 16
- **Redis**: Versi 7+

### Langkah-Langkah

1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-org/apiwatch.git
   cd apiwatch
   ```

2. **Install Dependensi**:
   ```bash
   pnpm install
   ```

3. **Konfigurasi Environment Variable**:
   ```bash
   cp .env.example .env.local
   ```
   Pastikan variabel `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, dan `ENCRYPTION_KEY` terisi dengan benar.

4. **Migrasi Database & Prisma Client**:
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

5. **Jalankan Aplikasi Web**:
   ```bash
   pnpm dev
   ```
   Aplikasi dapat diakses pada browser di [http://localhost:3000](http://localhost:3000).

6. **Jalankan Background Worker** *(di terminal terpisah)*:
   ```bash
   pnpm worker
   ```
   Worker akan langsung melakukan inisialisasi jadwal antrean BullMQ dan siap memproses monitoring jobs.

---

## 🐳 Panduan Deployment Produksi (Docker Compose)

APIWatch telah dilengkapi konfigurasi Docker Compose siap pakai untuk single VPS (Ubuntu LTS):

```bash
# 1. Masuk ke server VPS dan clone repository
git clone https://github.com/your-org/apiwatch.git /opt/apiwatch
cd /opt/apiwatch

# 2. Siapkan file environment produksi
cp .env.production.example .env
nano .env

# 3. Generate rahasia produksi kuat
openssl rand -hex 32 # untuk AUTH_SECRET
openssl rand -hex 32 # untuk ENCRYPTION_KEY

# 4. Bangun dan jalankan seluruh container
docker compose up -d --build

# 5. Cek status container
docker compose ps
```

### Memeriksa Log Layanan
```bash
# Log aplikasi web
docker compose logs -f web

# Log background worker
docker compose logs -f worker

# Log reverse proxy Caddy (sertifikat SSL/TLS)
docker compose logs -f proxy
```

### Prosedur Backup & Restore Database
```bash
# Melakukan backup instan
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh

# Melakukan restore dari file backup
./scripts/restore.sh /opt/apiwatch/backups/apiwatch_db_YYYYMMDD_HHMMSS.sql.gz
```

*Panduan lengkap sizing server, konfigurasi DNS A Record, dan rolling-update tersedia di [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md).*

---

## 📡 Referensi REST API

| Method | Endpoint | Deskripsi | Autentikasi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Status kesehatan sistem (DB & Redis) untuk container orchestrator | Publik |
| `POST` | `/api/auth/register` | Mendaftarkan pengguna dan workspace baru | Publik |
| `POST` | `/api/auth/login` | Login dan menerbitkan cookie sesi HMAC | Publik |
| `GET` | `/api/auth/me` | Informasi profil pengguna yang sedang login | Sesi |
| `POST` | `/api/auth/logout` | Menghapus cookie sesi | Sesi |
| `GET` | `/api/dashboard/summary` | Metrik ringkasan dashboard (total, up, down, incident, avg latency) | Sesi |
| `GET` | `/api/endpoints` | Daftar semua endpoint dalam workspace | Sesi |
| `POST` | `/api/endpoints` | Membuat pemantauan endpoint baru beserta assertions | Sesi |
| `GET` | `/api/endpoints/[id]` | Detail konfigurasi endpoint spesifik | Sesi |
| `PATCH` | `/api/endpoints/[id]` | Memperbarui konfigurasi endpoint | Sesi |
| `DELETE` | `/api/endpoints/[id]` | Menghapus endpoint dan riwayat monitoringnya | Sesi |
| `POST` | `/api/endpoints/[id]/check`| Memicu pengecekan instan (*on-demand check*) | Sesi |
| `GET` | `/api/endpoints/[id]/history` | Riwayat log pengecekan latensi dan status respon | Sesi |
| `POST` | `/api/endpoints/[id]/pause`| Menghentikan sementara jadwal monitoring | Sesi |
| `POST` | `/api/endpoints/[id]/resume` | Mengaktifkan kembali jadwal monitoring | Sesi |
| `GET` | `/api/endpoints/[id]/docs`| OpenAPI/Swagger-like documentation untuk endpoint | Sesi |
| `GET` | `/api/incidents` | Riwayat insiden gangguan performa & ketersediaan | Sesi |
| `GET` | `/api/reports` | Rekapitulasi SLA ketersediaan multi-periode (24h, 7d, 30d, 90d) | Sesi |
| `GET` | `/api/reports/export` | Download laporan performa format CSV (sanitasi CWE-1236) | Sesi |
| `GET` | `/status` | Papan status publik ketersediaan endpoint | Publik |

---

## 🧪 Pengujian & Verifikasi Kualitas

Kualitas kode dan keamanan telah diaudit dan diverifikasi secara berkala:

```bash
# Menjalankan 38 Automated Unit & Integration Tests
pnpm test

# Menjalankan static type checking
pnpm exec tsc --noEmit

# Menjalankan linter kode
pnpm lint

# Audit kerentanan dependensi produksi
pnpm audit --prod

# Menguji build produksi Next.js
pnpm build
```

### Hasil Audit Terakhir
- **Automated Tests**: **134/134 lulus (100% pass rate)** meliputi Unit, Integration, API, E2E, UI, RBAC, dan Edge Cases.
- **Audit Keamanan**: **0 kerentanan (0 vulnerabilities)** pada `pnpm audit --prod`.
- **Static Analysis**: **0 TypeScript errors & 0 ESLint warnings**.
- **Observability**: Prometheus metrics `/api/metrics`, deep health checks `/api/health?probe=ready`, structured JSON logger with PII redaction.
- **SaaS Business**: Multi-tier quotas (Free, Pro, Enterprise), 14-day Pro trial, webhook billing processor.
- **Build Output**: 42 routes terkompilasi sukses dengan Next.js standalone runner bundle.

---

## 📚 Dokumentasi Lengkap

Untuk informasi teknis lebih mendalam, pelajari dokumen pendukung berikut:
- 📖 [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) — Spesifikasi REST API lengkap dengan payload request/response & status code.
- 🚀 [`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md) — Pre-flight checklist, matrix audit, dan post-deployment smoke tests.
- 🗄️ [`docs/DATABASE_MIGRATION_GUIDE.md`](./docs/DATABASE_MIGRATION_GUIDE.md) — Prosedur migrasi produksi, zero-downtime evolution, dan disaster recovery runbook.
- ⚙️ [`docs/ENVIRONMENT_CONFIGURATION.md`](./docs/ENVIRONMENT_CONFIGURATION.md) — Panduan lengkap variabel lingkungan & rahasia kriptografi.
- 🚢 [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — Prosedur lengkap deployment VPS produksi dengan Caddy TLS & Docker Compose.
- 📐 [`TECHNICAL_PLAN.md`](./TECHNICAL_PLAN.md) — Cetak biru arsitektur, skema basis data, dan antrean BullMQ.
- 🎨 [`UI_UX_GUIDE.md`](./UI_UX_GUIDE.md) — Panduan visual, tipografi, palet warna, dan aturan aksesibilitas.
- 📢 [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) — Catatan rilis resmi v2.0.0.

---

## 📄 Lisensi

Proyek ini dikembangkan secara proprietary dan privat untuk **APIWatch Platform**.  
Seluruh hak cipta dilindungi undang-undang.
