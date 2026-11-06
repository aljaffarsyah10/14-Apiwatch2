# APIWatch — Product Requirements Document & Sequential Development Playbook

MVP Development Blueprint

10 Development Phases

Solo Developer

Nama dokumen: `PROJECT_PRD_AND_PLAYBOOK.md`\
Nama project: APIWatch – API Monitoring\
Kategori: Developer Tools / MicroSaaS\
Target platform: Web Application\
Target pengguna: Publik, khususnya developer, software engineer, startup, dan tim IT\
Development approach: AI-Assisted Development / Vibe Coding\
Tingkat kompleksitas: Medium

Dokumen ini dirancang sebagai single source of truth selama pengembangan APIWatch. Setiap phase harus dikerjakan secara berurutan, diverifikasi, dan mendapatkan persetujuan sebelum melanjutkan ke phase berikutnya.

Keputusan arsitektur utama:

APIWatch menggunakan Next.js untuk web application dan dashboard, PostgreSQL untuk penyimpanan data, Redis + BullMQ untuk penjadwalan dan pemrosesan monitoring, serta dedicated Node.js Worker untuk menjalankan HTTP checks.

Pemisahan Worker dari Next.js diperlukan karena monitoring harus tetap berjalan meskipun tidak ada pengguna yang sedang membuka dashboard. Selain itu, proses monitoring memerlukan scheduler, retry, concurrency control, dan eksekusi background yang berkelanjutan.

# PART A — PRODUCT REQUIREMENTS DOCUMENT (PRD)

# 1. Product Information

## 1.1 Product Identity

| Item                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| Product Name         | APIWatch                                                 |
| Product Type         | API Monitoring SaaS                                      |
| Category             | Developer Tools                                          |
| Platform             | Web Application                                          |
| Target Market        | Global, dengan pendekatan awal untuk developer Indonesia |
| Business Model       | Freemium / Subscription                                  |
| Development          | Solo Developer + AI Coding Assistant                     |
| Development Priority | MVP First                                                |
| Architecture         | Modular Monolith + Dedicated Worker                      |
| Complexity           | Medium                                                   |

## 1.2 Product Description

APIWatch adalah platform API monitoring yang memungkinkan developer memantau ketersediaan dan performa endpoint API secara otomatis.

Pengguna dapat mendaftarkan endpoint API, menentukan interval pemeriksaan, mengatur validasi HTTP response, serta menerima notifikasi ketika endpoint mengalami gangguan.

APIWatch melakukan pemeriksaan secara berkala melalui background monitoring worker dan menyimpan hasil pemeriksaan untuk ditampilkan dalam dashboard.

Selain monitoring, APIWatch menyediakan dokumentasi endpoint dan laporan sederhana sehingga developer dapat memahami kondisi API tanpa harus memeriksa endpoint secara manual.

## 1.3 Target Development Stack

| Layer             | Technology             | Purpose                     |
| ----------------- | ---------------------- | --------------------------- |
| Frontend          | Next.js App Router     | Web application             |
| Language          | TypeScript             | Type safety                 |
| Styling           | Tailwind CSS           | UI styling                  |
| UI Components     | shadcn/ui              | Reusable components         |
| Client State      | Zustand (selective)    | Shared client state         |
| Backend API       | Next.js Route Handlers | REST API                    |
| Background Worker | Node.js + TypeScript   | Monitoring engine           |
| Queue             | BullMQ                 | Job scheduling              |
| Queue Storage     | Redis                  | Job queue and scheduling    |
| Database          | PostgreSQL             | Persistent application data |
| ORM               | Prisma                 | Database access             |
| Validation        | Zod                    | Input validation            |
| HTTP Client       | Native fetch           | HTTP requests               |
| Authentication    | Auth.js                | User authentication         |
| Charts            | Recharts               | Monitoring visualization    |
| Email             | SMTP provider          | Email notifications         |
| Testing           | Vitest + Playwright    | Unit and E2E testing        |
| Deployment        | Docker + VPS           | Application hosting         |
| Reverse Proxy     | Caddy or Nginx         | HTTPS and routing           |

Catatan keputusan teknologi:

1. Next.js digunakan sebagai presentation layer dan application backend.
2. Dedicated Node.js Worker digunakan untuk menjalankan monitoring jobs.
3. BullMQ membutuhkan Redis sebagai backend queue.
4. PostgreSQL digunakan untuk menyimpan data permanen.
5. Prisma digunakan untuk mempermudah pengelolaan schema dan query.
6. Native `fetch` cukup untuk HTTP monitoring; Axios tidak diwajibkan.
7. Zustand hanya digunakan apabila shared client state memang diperlukan.
8. Docker digunakan untuk menyederhanakan deployment beberapa service yang harus berjalan bersamaan.

## 1.4 Project Constraints

- Pengembangan dilakukan oleh satu developer.
- AI Coding Assistant digunakan secara bertahap.
- Fokus pada fitur yang benar-benar diperlukan untuk MVP.
- Tidak menggunakan microservices.
- Tidak membuat sistem distributed monitoring yang kompleks.
- Tidak membuat monitoring agent untuk berbagai lokasi geografis pada MVP.
- Tidak membuat fitur observability seperti distributed tracing.
- Tidak menggunakan teknologi desktop application.
- Seluruh business logic harus dapat diuji secara independen.
- Background monitoring tidak boleh bergantung pada browser pengguna.

## 1.5 Assumptions

Karena beberapa kebutuhan belum ditentukan, berikut asumsi awal:

| Area               | Assumption                                                     |
| ------------------ | -------------------------------------------------------------- |
| Authentication     | Email/password atau magic link melalui Auth.js                 |
| User model         | Setiap pengguna memiliki workspace personal                    |
| Monitoring         | HTTP/HTTPS endpoint                                            |
| Default interval   | 5 menit                                                        |
| Minimum interval   | 1 menit untuk konfigurasi internal atau paket yang mengizinkan |
| Default timeout    | 10 detik                                                       |
| Default retries    | 0 pada MVP untuk menghindari pemeriksaan berlebihan            |
| Default history    | 30 hari                                                        |
| Notification       | Email                                                          |
| Billing            | Belum diimplementasikan pada MVP                               |
| Deployment         | Single VPS dengan Docker Compose                               |
| Monitoring region  | Satu region pada MVP                                           |
| API authentication | Header dan Bearer Token                                        |
| Public status page | Tidak wajib pada MVP                                           |

Nilai interval dan batas penggunaan di atas merupakan default desain awal, bukan batas permanen. Nilai tersebut harus dapat disesuaikan melalui konfigurasi paket.

# 2. Product Overview

## 2.1 Problem Statement

Developer sering menghadapi situasi ketika API atau backend service mengalami gangguan tanpa diketahui secara langsung.

Contoh permasalahan:

1. API mengalami HTTP 500 tetapi developer tidak mengetahui kapan gangguan dimulai.
2. Endpoint API lambat dan menyebabkan aplikasi frontend ikut melambat.
3. Server mengalami downtime ketika developer tidak sedang memantau.
4. Developer harus melakukan pengecekan manual menggunakan Postman, browser, curl, atau tools lainnya.
5. Tidak tersedia riwayat status dan response time yang mudah dipahami.
6. Developer tidak memiliki notifikasi otomatis ketika API mengalami gangguan.
7. Dokumentasi endpoint dan konfigurasi monitoring sering tersebar di berbagai tempat.

## 2.2 Proposed Solution

APIWatch menyediakan monitoring otomatis untuk endpoint HTTP/HTTPS.

Pengguna cukup mendaftarkan URL endpoint dan konfigurasi pemeriksaan.

Sistem kemudian:

1. Menyimpan konfigurasi endpoint.
2. Menjadwalkan monitoring job.
3. Memasukkan job ke Redis melalui BullMQ.
4. Worker mengambil job.
5. Worker melakukan HTTP request ke endpoint.
6. Worker mengukur response time.
7. Worker memvalidasi status code, headers, dan response body.
8. Worker menyimpan hasil pemeriksaan ke PostgreSQL.
9. Sistem memperbarui status endpoint.
10. Sistem mengirim notifikasi apabila terjadi perubahan kondisi atau kegagalan sesuai aturan alert.

## 2.3 Core Value Proposition

APIWatch membantu developer mengetahui kondisi API secara otomatis tanpa harus melakukan pengecekan manual.

Nilai utama:

- Automated API monitoring.
- HTTP status monitoring.
- Response time tracking.
- Header and body validation.
- Historical monitoring data.
- Email notifications.
- Endpoint documentation.
- Simple monitoring reports.

## 2.4 Product Workflow

User Dashboard

Create and configure endpoint

Next.js API

Validate and save configuration

PostgreSQL + BullMQ

Store endpoint and schedule jobs

Node.js Monitoring Worker

Execute HTTP checks

Success

Save metrics

Failure

Save and alert

Dashboard & Reports

Display status, latency, and history

## 2.5 Example Use Case

Seorang developer memiliki endpoint:

```
https://api.example.com/v1/users
```

Developer mendaftarkan endpoint tersebut dengan konfigurasi:

```
{
  "name": "User API",
  "method": "GET",
  "url": "https://api.example.com/v1/users",
  "intervalSeconds": 300,
  "timeoutMs": 10000,
  "expectedStatusCodes": [200],
  "expectedHeaders": {
    "content-type": "application/json"
  },
  "expectedBodyContains": "users"
}
```

Setiap lima menit APIWatch melakukan pemeriksaan.

Apabila endpoint menghasilkan HTTP 500, sistem:

- Menyimpan hasil pemeriksaan.
- Mengubah status endpoint menjadi DOWN sesuai aturan status.
- Mengirim email alert jika kondisi memenuhi aturan notifikasi.
- Menampilkan kegagalan pada dashboard.
- Menyimpan riwayat response time dan error.

# 3. Product Goals

## 3.1 MVP Goals

| Goal                   | Success Metric                                           |
| ---------------------- | -------------------------------------------------------- |
| Automated monitoring   | Endpoint dapat diperiksa otomatis                        |
| HTTP status validation | Status code dapat divalidasi                             |
| Performance monitoring | Response time dapat diukur                               |
| Response validation    | Header dan body dapat divalidasi                         |
| Historical tracking    | Riwayat hasil check tersimpan                            |
| Notification           | Email alert berhasil dikirim                             |
| Dashboard              | Kondisi endpoint dapat dilihat                           |
| Reliability            | Worker dapat berjalan tanpa browser                      |
| Security               | Endpoint monitoring terlindungi dari SSRF                |
| Usability              | Pengguna dapat menambahkan endpoint tanpa bantuan teknis |

## 3.2 MVP Completion Targets

Target awal pengujian:

- Monitoring job berhasil diproses sesuai jadwal.
- Setidaknya 95% job test environment selesai tanpa kesalahan internal sistem.
- Response time dicatat dalam millisecond.
- Riwayat monitoring dapat ditampilkan.
- Alert tidak dikirim berulang kali untuk setiap polling ketika endpoint masih DOWN.
- Pengguna tidak dapat mengakses endpoint milik pengguna lain.
- Monitoring worker dapat dipulihkan setelah restart.
- Tidak ada credential sensitif yang ditampilkan dalam response API atau log.

Angka tersebut merupakan target validasi MVP, bukan jaminan SLA produksi.

## 3.3 Non-Goals

MVP tidak bertujuan menjadi:

- Full observability platform.
- APM platform.
- Distributed tracing system.
- Infrastructure monitoring platform.
- Log aggregation platform.
- Load testing platform.
- API gateway.
- API performance benchmarking platform.
- Multi-region monitoring network.

# 4. Target Users

## 4.1 Primary Users

| User                   | Description        | Main Needs                             |
| ---------------------- | ------------------ | -------------------------------------- |
| Independent Developer  | Developer individu | Monitoring API pribadi                 |
| Backend Developer      | Developer backend  | HTTP status dan response time          |
| Frontend Developer     | Developer frontend | Mengetahui API yang digunakan aplikasi |
| Startup Founder        | Pemilik startup    | Memantau service utama                 |
| Small Development Team | Tim kecil          | Monitoring endpoint bersama            |
| API Provider           | Pemilik API publik | Mengetahui ketersediaan API            |

## 4.2 User Personas

Persona A — Independent Developer

Memiliki beberapa API yang di-host di VPS atau cloud.

Pain points:

- Tidak mengetahui downtime.
- Harus melakukan pengecekan manual.
- Tidak memiliki histori gangguan.

Persona B — Startup Developer

Mengelola beberapa endpoint untuk aplikasi production.

Pain points:

- API kadang lambat.
- Sulit mengetahui waktu mulai gangguan.
- Membutuhkan alert ketika API bermasalah.

Persona C — API Service Owner

Menyediakan API untuk pengguna lain.

Pain points:

- Membutuhkan monitoring berkala.
- Ingin mengetahui availability.
- Membutuhkan laporan kondisi API.

## 4.3 User Permissions

MVP menggunakan model akses personal.

| Role          | Permission                          |
| ------------- | ----------------------------------- |
| User          | Manage own endpoints                |
| User          | View own monitoring history         |
| User          | Manage own notification settings    |
| User          | Manage own endpoint documentation   |
| System Worker | Execute authorized monitoring jobs  |
| System        | Process alerts and scheduled checks |

Admin panel khusus belum diperlukan untuk MVP. Operasional dapat menggunakan database dan infrastructure monitoring.

# 5. Scope & Feature Priorities

## 5.1 P0 — Core MVP

Must Have

| Feature                | Description                      |
| ---------------------- | -------------------------------- |
| Authentication         | Registrasi, login, logout        |
| Dashboard              | Ringkasan monitoring             |
| Endpoint Management    | Tambah, edit, hapus endpoint     |
| HTTP Monitoring        | Pemeriksaan HTTP/HTTPS           |
| Status Code Validation | Validasi HTTP status             |
| Response Time          | Pengukuran latency               |
| Header Validation      | Validasi expected headers        |
| Body Validation        | Validasi response body           |
| Monitoring Scheduler   | Penjadwalan otomatis             |
| Background Worker      | Eksekusi monitoring              |
| Monitoring History     | Riwayat hasil pemeriksaan        |
| Endpoint Status        | UP, DOWN, PAUSED                 |
| Email Alert            | Notifikasi ketika status berubah |
| Basic Settings         | Konfigurasi timeout dan interval |

## 5.2 P1 — Supporting Features

After Core MVP

| Feature                     | Description                                 |
| --------------------------- | ------------------------------------------- |
| Endpoint Documentation      | Deskripsi, method, headers, dan parameter   |
| Detailed Monitoring Reports | Statistik availability dan latency          |
| Response Preview            | Preview response body yang sudah disanitasi |
| Manual Check                | Trigger pemeriksaan manual                  |
| CSV Export                  | Export hasil monitoring                     |
| Alert Configuration         | Pengaturan threshold dan notifikasi         |
| Better Dashboard            | Grafik dan filter monitoring                |
| Public Status Page          | Halaman status publik sederhana             |

P1 dapat dikerjakan setelah seluruh core user flow P0 berjalan.

## 5.3 P2 — Future Development

| Feature                   | Description                     |
| ------------------------- | ------------------------------- |
| Subscription & Billing    | Pembayaran paket                |
| Multi-user Workspace      | Kolaborasi tim                  |
| Slack Integration         | Notifikasi Slack                |
| Telegram Integration      | Notifikasi Telegram             |
| Webhook Notification      | Integrasi webhook               |
| Multi-region Monitoring   | Monitoring dari berbagai region |
| Advanced Assertions       | JSONPath dan schema validation  |
| API Performance Analytics | Analisis performa lanjutan      |
| Incident Management       | Incident lifecycle              |
| Public API                | API untuk integrasi eksternal   |
| Status Page Custom Domain | Custom domain                   |
| Maintenance Windows       | Jadwal maintenance              |
| SLA Reports               | Laporan SLA                     |
| API Monitoring Templates  | Template konfigurasi monitoring |

## 5.4 MVP Scope Restrictions

Hal berikut tidak boleh dikerjakan dalam phase MVP:

- Multi-tenant organization kompleks.
- Billing otomatis.
- Team invitation.
- Monitoring agent multi-region.
- Browser automation.
- WebSocket monitoring.
- gRPC monitoring.
- GraphQL-specific assertion engine.
- Distributed worker cluster.
- AI-based anomaly detection.
- Advanced JSON schema validation.
- Custom dashboard builder.

## 5.5 Recommended MVP Limitation

Agar pengembangan realistis:

- Hanya HTTP dan HTTPS.
- Method GET, POST, PUT, PATCH, DELETE, dan HEAD.
- Maksimal ukuran response yang dibaca dibatasi.
- Timeout maksimal 30 detik.
- Header authentication didukung.
- Bearer Token dan custom headers didukung.
- Request body sederhana didukung.
- Expected status code didukung.
- Expected header didukung.
- Body substring matching didukung.
- Tidak menjalankan JavaScript atau script dari response.
- Tidak mengikuti redirect lintas host tanpa validasi keamanan.
- Tidak menyimpan response body lengkap secara default.

# 6. Functional Requirements

## FR-01 — User Registration

Description: Pengguna dapat membuat akun.

System behavior:

- Menerima email dan password.
- Memvalidasi input.
- Memeriksa duplikasi email.
- Menyimpan user.
- Membuat workspace personal apabila diperlukan oleh model data.

Acceptance criteria:

- Email harus valid.
- Password memenuhi kebijakan keamanan.
- Email duplikat ditolak.
- Password disimpan dalam bentuk hash.
- User dapat login setelah registrasi.

## FR-02 — User Authentication

Description: Pengguna dapat login dan logout.

System behavior:

- Mengautentikasi pengguna.
- Membuat session.
- Melindungi route dashboard.
- Menyediakan logout.

Acceptance criteria:

- Pengguna yang belum login tidak dapat membuka dashboard.
- Session dapat divalidasi di server.
- Logout mengakhiri session.
- Data pengguna tidak dapat diakses melalui manipulasi user ID.

## FR-03 — Dashboard Overview

Description: Dashboard menampilkan ringkasan monitoring.

Informasi:

- Total endpoints.
- UP endpoints.
- DOWN endpoints.
- PAUSED endpoints.
- Recent incidents.
- Average response time.
- Recent monitoring activity.

Acceptance criteria:

- Angka diambil dari data aktual.
- Dashboard menampilkan empty state.
- Dashboard memperlihatkan loading state.
- Data hanya berasal dari workspace pengguna.

## FR-04 — Create Endpoint

Description: Pengguna dapat menambahkan endpoint.

Input:

- Endpoint name.
- URL.
- HTTP method.
- Monitoring interval.
- Timeout.
- Expected status codes.
- Request headers.
- Request body.
- Expected headers.
- Expected body content.

Acceptance criteria:

- Nama wajib diisi.
- URL harus valid.
- Hanya HTTP/HTTPS.
- Interval harus berada dalam batas paket.
- Timeout harus valid.
- Input tervalidasi di server.
- Endpoint terhubung dengan workspace pengguna.
- URL melewati validasi SSRF sebelum monitoring.

## FR-05 — Update Endpoint

Description: Pengguna dapat mengubah konfigurasi endpoint.

Acceptance criteria:

- Endpoint harus dimiliki pengguna.
- Perubahan konfigurasi tersimpan.
- Job monitoring berikutnya menggunakan konfigurasi terbaru.
- Job lama yang masih berjalan tidak boleh menggunakan konfigurasi yang tidak konsisten tanpa kontrol versi konfigurasi.

Implementasi yang disarankan: simpan `configVersion` atau gunakan konfigurasi snapshot pada setiap monitoring job.

## FR-06 — Delete Endpoint

Description: Pengguna dapat menghapus endpoint.

Acceptance criteria:

- Hanya pemilik yang dapat menghapus endpoint.
- Endpoint tidak dijadwalkan kembali.
- Job terkait dibatalkan atau dibuat tidak aktif.
- Riwayat dihapus atau dipertahankan sesuai kebijakan retensi.
- Tidak meninggalkan scheduler job aktif yang tidak memiliki endpoint valid.

## FR-07 — HTTP Monitoring

Description: Sistem melakukan pemeriksaan HTTP secara otomatis.

System behavior:

- Worker mengambil job.
- Memuat konfigurasi endpoint.
- Melakukan HTTP request.
- Mengukur response time.
- Menangkap status code.
- Mendeteksi timeout.
- Menangani connection error.

Acceptance criteria:

- Request berjalan pada interval yang ditentukan.
- Monitoring tidak bergantung pada browser.
- Timeout menghasilkan status failure yang jelas.
- Hasil pemeriksaan tersimpan.
- Worker tidak crash akibat endpoint yang tidak dapat dijangkau.

## FR-08 — Status Code Validation

Description: Sistem memvalidasi status code berdasarkan konfigurasi.

Acceptance criteria:

- Expected status codes dapat berisi satu atau beberapa nilai.
- Status yang tidak sesuai menghasilkan failed check.
- Status code tetap dicatat meskipun validasi gagal.

## FR-09 — Response Time Measurement

Description: Sistem mengukur waktu respons.

Metodologi:

```
start = performance.now()

response = await fetch(...)

end = performance.now()

responseTimeMs = end - start
```

Acceptance criteria:

- Menggunakan monotonic clock.
- Hasil disimpan dalam millisecond.
- Timeout dan connection error memiliki representasi yang jelas.
- Response time tidak dihitung menggunakan waktu render frontend.

Catatan: angka ini adalah total waktu request hingga response headers diterima, bukan pengukuran TTFB yang sepenuhnya setara dengan metrik browser maupun pengukuran transfer seluruh body.

## FR-10 — Header Validation

Description: Sistem memeriksa expected response headers.

Acceptance criteria:

- Nama header dibandingkan tanpa memperhatikan kapitalisasi.
- Nilai dapat dibandingkan dengan aturan exact atau contains.
- Missing header menghasilkan failed assertion.
- Header sensitif tidak diekspos kepada pengguna lain.

## FR-11 — Body Validation

Description: Sistem memvalidasi response body.

MVP:

- Contains.
- Not contains.

Acceptance criteria:

- Body dibatasi ukuran maksimal.
- Validasi hanya membaca body dalam batas aman.
- Response body tidak diekspos secara default.
- Body yang terlalu besar menghasilkan kondisi yang terkontrol.
- Validasi body dapat menghasilkan error yang dapat dipahami.

## FR-12 — Monitoring Scheduler

Description: Sistem menjadwalkan monitoring job.

Acceptance criteria:

- Endpoint aktif memiliki jadwal.
- Endpoint paused tidak dijadwalkan.
- Perubahan interval memperbarui scheduler.
- Tidak ada scheduler job ganda untuk endpoint yang sama.
- Scheduler dapat dipulihkan setelah restart.
- Job memiliki unique identifier yang konsisten.

## FR-13 — Monitoring History

Description: Sistem menyimpan hasil pemeriksaan.

Data:

- Timestamp.
- HTTP status.
- Response time.
- Check result.
- Failure reason.
- Assertion result.

Acceptance criteria:

- Riwayat dapat difilter berdasarkan endpoint.
- Riwayat dapat dipaginasi.
- Data tersimpan permanen hingga kebijakan retensi menghapusnya.
- Riwayat antar pengguna terisolasi.

## FR-14 — Endpoint Status

Description: Sistem menentukan status endpoint.

Status:

- UP.
- DOWN.
- PAUSED.
- PENDING.

Acceptance criteria:

- UP ketika check terbaru berhasil.
- DOWN ketika check terbaru gagal.
- PAUSED ketika monitoring dinonaktifkan.
- PENDING ketika belum pernah diperiksa.
- Status diperbarui secara konsisten berdasarkan hasil worker.

## FR-15 — Email Alert

Description: Sistem mengirim notifikasi ketika endpoint berubah kondisi.

Acceptance criteria:

- Email dikirim saat transisi UP ke DOWN.
- Email recovery dikirim saat transisi DOWN ke UP.
- Tidak mengirim email berulang untuk setiap check yang gagal selama incident yang sama.
- Email berisi endpoint name, URL yang aman ditampilkan, waktu kejadian, dan alasan kegagalan.
- Kegagalan pengiriman email tidak menggagalkan monitoring job.

## FR-16 — Pause and Resume Monitoring

Description: Pengguna dapat menghentikan sementara monitoring.

Acceptance criteria:

- Endpoint paused tidak mendapatkan job monitoring baru.
- Resume mengaktifkan kembali jadwal.
- Status berubah sesuai kondisi.
- Histori sebelumnya tetap tersedia.

## FR-17 — Manual Monitoring

Description: Pengguna dapat menjalankan check secara manual.

Acceptance criteria:

- Trigger dilakukan melalui backend.
- Pengguna tidak dapat melewati batas concurrency.
- Job manual memiliki penanda khusus.
- Hasil muncul setelah job selesai.

## FR-18 — Endpoint Documentation

Description: Pengguna dapat menambahkan informasi dokumentasi endpoint.

Field:

- Description.
- HTTP method.
- URL.
- Authentication type.
- Headers.
- Request example.
- Expected response.
- Notes.

Acceptance criteria:

- Dokumentasi dapat dibuat dan diedit.
- Dokumentasi terhubung dengan endpoint.
- Credential tidak ditampilkan secara utuh.
- Informasi tetap dapat dibaca dengan baik pada detail endpoint.

## FR-19 — Monitoring Reports

Description: Sistem menampilkan laporan sederhana.

Metrik:

- Uptime percentage.
- Average response time.
- Minimum response time.
- Maximum response time.
- Total checks.
- Failed checks.

Acceptance criteria:

- Perhitungan menggunakan data historis.
- Filter periode tersedia.
- Data yang tidak lengkap tidak dianggap sebagai downtime tanpa aturan yang jelas.

## FR-20 — Monitoring Configuration Limits

Description: Sistem menerapkan limit sesuai paket.

MVP:

- Jumlah endpoint.
- Minimum monitoring interval.
- Retention history.
- Manual check rate.

Acceptance criteria:

- Limit diperiksa di server.
- Tidak dapat dilewati dengan mengubah request frontend.
- Konfigurasi paket terpusat.

# 7. Non-Functional Requirements

## 7.1 Performance

- Dashboard harus memuat data menggunakan pagination.
- Query riwayat menggunakan index database.
- Monitoring worker menggunakan concurrency limit.
- Monitoring response body memiliki batas ukuran.
- API response menggunakan struktur JSON konsisten.
- Background job tidak boleh menjalankan query yang tidak diperlukan.

Target awal:

- Dashboard API p95 di bawah 500 ms untuk dataset MVP normal.
- Monitoring job diproses sesuai kapasitas worker.
- Dashboard menggunakan pagination untuk data historis.

## 7.2 Reliability

- Worker harus dapat restart.
- BullMQ harus menangani retry dan stalled jobs secara terkontrol.
- Scheduler harus dapat direkonstruksi dari database.
- Database dan Redis harus memiliki persistent storage.
- Job monitoring harus idempotent sejauh memungkinkan.
- Notification failure tidak boleh menggagalkan monitoring.

## 7.3 Security

- Semua input divalidasi server-side.
- Password menggunakan hashing yang aman.
- Session dilindungi.
- Endpoint access menggunakan ownership verification.
- Monitoring worker memiliki SSRF protection.
- Redis tidak diekspos ke public internet.
- Credential dienkripsi saat disimpan.
- Log tidak mengandung token atau password.

## 7.4 Scalability

MVP menggunakan satu worker service dengan concurrency terbatas.

Scale-up dapat dilakukan dengan menambah worker instance apabila:

- Jumlah endpoint bertambah.
- Queue backlog meningkat.
- Kapasitas pemeriksaan tidak mencukupi.

Belum diperlukan microservices atau distributed architecture.

## 7.5 Maintainability

- TypeScript digunakan secara konsisten.
- Business logic dipisahkan dari UI.
- Database access menggunakan repository atau data access module.
- Validation menggunakan schema.
- Worker dapat diuji secara independen.
- Environment configuration terpusat.
- Hindari circular dependencies.

## 7.6 Accessibility

- Form memiliki label.
- Status tidak hanya dibedakan melalui warna.
- Komponen dapat digunakan dengan keyboard.
- Focus state terlihat.
- Dialog memiliki accessible title.
- Kontras warna memadai.

## 7.7 Compatibility

Target:

- Chrome.
- Edge.
- Firefox.
- Safari.
- Mobile browser modern.

## 7.8 Privacy

- Credential tidak pernah ditampilkan kembali secara penuh.
- Monitoring history memiliki kebijakan retensi.
- Pengguna hanya mengakses datanya sendiri.
- Public status page tidak aktif secara default.
- Response body tidak disimpan secara default.

# 8. Application Structure & Navigation

## 8.1 Public Routes

| Route       | Page             |
| ----------- | ---------------- |
| `/`         | Landing page     |
| `/features` | Product features |
| `/pricing`  | Pricing          |
| `/login`    | Login            |
| `/register` | Registration     |
| `/privacy`  | Privacy policy   |
| `/terms`    | Terms of service |

## 8.2 Dashboard Routes

| Route                            | Page                  |
| -------------------------------- | --------------------- |
| `/dashboard`                     | Overview              |
| `/dashboard/endpoints`           | Endpoint list         |
| `/dashboard/endpoints/new`       | Create endpoint       |
| `/dashboard/endpoints/[id]`      | Endpoint detail       |
| `/dashboard/endpoints/[id]/edit` | Edit endpoint         |
| `/dashboard/history`             | Monitoring history    |
| `/dashboard/reports`             | Reports               |
| `/dashboard/notifications`       | Notification settings |
| `/dashboard/settings`            | Account settings      |

## 8.3 Navigation Structure

```
APIWatch
│
├── Public
│   ├── Home
│   ├── Features
│   ├── Pricing
│   ├── Login
│   └── Register
│
└── Dashboard
    ├── Overview
    ├── Endpoints
    │   ├── List
    │   ├── Create
    │   ├── Detail
    │   └── Edit
    ├── History
    ├── Reports
    ├── Notifications
    └── Settings
```

## 8.4 Layout

Public layout:

- Navbar.
- Main content.
- Footer.

Dashboard layout:

- Sidebar.
- Header.
- Breadcrumb.
- Main content.
- Notification area.

## 8.5 Reusable Components

| Component           | Responsibility                  |
| ------------------- | ------------------------------- |
| AppSidebar          | Dashboard navigation            |
| DashboardHeader     | User and page actions           |
| StatCard            | Summary metric                  |
| EndpointStatusBadge | UP/DOWN/PAUSED                  |
| EndpointTable       | Endpoint listing                |
| EndpointForm        | Endpoint configuration          |
| MonitoringChart     | Response time chart             |
| HistoryTable        | Check history                   |
| EmptyState          | Empty data display              |
| ErrorState          | Error feedback                  |
| LoadingSkeleton     | Loading feedback                |
| ConfirmDialog       | Destructive confirmation        |
| AlertSettingsForm   | Notification configuration      |
| StatusTimeline      | Historical status visualization |

# 9. User Flow

## 9.1 Main User Flow

\#chatgpt-mermaid-\_r_972\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_972\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_972\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_972\_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-\_r_972\_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_972\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_972\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_972\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_972\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_972\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_972\_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_972\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_972\_ p{margin:0;}#chatgpt-mermaid-\_r_972\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ .cluster-label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ .cluster-label span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_972\_ .label text,#chatgpt-mermaid-\_r_972\_ span{fill:rgb(13, 13, 13);color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ .node rect,#chatgpt-mermaid-\_r_972\_ .node circle,#chatgpt-mermaid-\_r_972\_ .node ellipse,#chatgpt-mermaid-\_r_972\_ .node polygon,#chatgpt-mermaid-\_r_972\_ .node path{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .rough-node .label text,#chatgpt-mermaid-\_r_972\_ .node .label text,#chatgpt-mermaid-\_r_972\_ .image-shape .label,#chatgpt-mermaid-\_r_972\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_972\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .rough-node .label,#chatgpt-mermaid-\_r_972\_ .node .label,#chatgpt-mermaid-\_r_972\_ .image-shape .label,#chatgpt-mermaid-\_r_972\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_972\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_972\_ .root .anchor path{fill:rgb(143, 143, 143)!important;stroke-width:0;stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_972\_ .arrowheadPath{fill:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_972\_ .edgePath .path{stroke:rgb(143, 143, 143);stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .flowchart-link{stroke:rgb(143, 143, 143);fill:none;}#chatgpt-mermaid-\_r_972\_ .edgeLabel{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_972\_ .edgeLabel p{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_972\_ .edgeLabel rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_972\_ .labelBkg{background-color:rgba(252, 252, 252, 0.5);}#chatgpt-mermaid-\_r_972\_ .cluster rect{fill:rgb(243, 243, 243);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .cluster text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ .cluster span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:12px;background:rgb(243, 243, 243);border:1px solid rgba(0, 0, 0, 0.1);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_972\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_972\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_972\_ .icon-shape,#chatgpt-mermaid-\_r_972\_ .image-shape{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_972\_ .icon-shape p,#chatgpt-mermaid-\_r_972\_ .image-shape p{background-color:rgb(252, 252, 252);padding:2px;}#chatgpt-mermaid-\_r_972\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_972\_ .image-shape .label rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_972\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_972\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_972\_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_972\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_972\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_972\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_972\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_972\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_972\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_972\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_972\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_972\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_972\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_972\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_972\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .node rect,#chatgpt-mermaid-\_r_972\_ .node circle,#chatgpt-mermaid-\_r_972\_ .node ellipse,#chatgpt-mermaid-\_r_972\_ .node polygon,#chatgpt-mermaid-\_r_972\_ .node path{fill:rgb(229, 243, 255);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_972\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_972\_ .mermaid-decision .label-container{fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-dasharray:2px,2px;}#chatgpt-mermaid-\_r_972\_ .edgePaths .flowchart-link{stroke:rgb(143, 143, 143);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_972\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_972\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}Open APIWatchAuthenticated?Register or LoginDashboardHas Endpoint?Create First EndpointView Monitoring DashboardConfigure EndpointSave EndpointValidate ConfigurationSchedule MonitoringWorker Executes CheckSave Monitoring ResultUpdate Endpoint StatusStatus Changed?Send Email AlertUpdate DashboardView History and ReportsNoYesNoYesInvalidValidYesNo

## 9.2 Endpoint Creation Flow

1. Pengguna membuka dashboard.
2. Pengguna menekan Add Endpoint.
3. Sistem menampilkan form.
4. Pengguna mengisi endpoint URL.
5. Pengguna menentukan HTTP method.
6. Pengguna menentukan monitoring interval.
7. Pengguna mengatur expected response.
8. Sistem memvalidasi input.
9. Sistem memeriksa SSRF policy.
10. Sistem menyimpan konfigurasi.
11. Sistem mendaftarkan monitoring job.
12. Endpoint muncul di dashboard.

## 9.3 Monitoring Failure Flow

1. Worker menerima monitoring job.
2. Worker memanggil endpoint.
3. Request gagal atau assertion tidak sesuai.
4. Worker menyimpan failed check.
5. Sistem memperbarui status endpoint.
6. Sistem membuat atau memperbarui incident.
7. Sistem mengirim email alert jika merupakan transisi baru.
8. Dashboard menampilkan status DOWN.

## 9.4 Recovery Flow

1. Endpoint yang sebelumnya DOWN kembali berhasil.
2. Worker menyimpan successful check.
3. Status endpoint menjadi UP.
4. Incident ditandai resolved.
5. Sistem mengirim recovery notification.
6. Dashboard memperlihatkan waktu recovery.

# 10. UI/UX Requirements

## 10.1 Design Direction

APIWatch harus memiliki desain:

- Modern developer dashboard.
- Minimalis.
- Professional.
- Information-dense tetapi mudah dibaca.
- Consistent spacing.
- Responsive.
- Fokus pada informasi monitoring.

## 10.2 Color System

| Token      | Purpose                     |
| ---------- | --------------------------- |
| Background | Main application background |
| Surface    | Cards and panels            |
| Primary    | Main actions                |
| Success    | UP status                   |
| Danger     | DOWN status                 |
| Warning    | Degraded or warning         |
| Muted      | Secondary information       |
| Border     | Separation                  |

Status colors harus selalu disertai teks, bukan hanya warna.

## 10.3 Typography

Rekomendasi:

- Inter atau Geist.
- Heading jelas.
- Body mudah dibaca.
- Monospace untuk URL, HTTP methods, dan response data.

## 10.4 Dashboard Layout

[API Monitoring — Uptime & Latency Checks | Watchlog](https://images.openai.com/static-rsc-4/BTKPh8D0vE7N-HT-daFGxcRVY-bRfMxeqTbL7BpGTq2c3BimfjvDogaio7FH5XekG-S8hJXuKRnmwbq7n4I8s1nI_cZ8k-6D8zjJRxlDFYF6yrOWGqnquuWEalXKkPr1-WufjihVUjz5nxmu1Intquo5CYC5fSVCPQnvrvzuy5o?purpose=inline)

[watchlog.io](https://watchlog.io/products/api-monitoring?utm_source=chatgpt.com)

Dashboard overview berisi:

1. Total monitored endpoints.
2. UP endpoints.
3. DOWN endpoints.
4. Average response time.
5. Response time chart.
6. Recent incidents.
7. Endpoint status list.

## 10.5 Endpoint Detail Layout

[Monitive: Detect downtime before your customers do](https://images.openai.com/static-rsc-4/HW7YQy2kaXV3qK4IiTyVrnoMiyfFsFYAL2a1Zr_RuNBcqpxILXBPogZbqdk9eeKynMraRp7c5B8HECSgHRIaXI2f9VgwK05VB_fN_2IV5JJ4OZ3YRWciYZioqvu6jkCdJ2nA_HvSzFz-O0R-XkcpK2yCPNGOu9FAFn7Fr4kVSkI?purpose=inline)

[monitive.com](https://monitive.com/?utm_source=chatgpt.com)

Detail endpoint berisi:

- Endpoint name.
- URL.
- HTTP method.
- Current status.
- Last checked.
- Response time.
- Monitoring configuration.
- Response validation.
- History.
- Documentation.

## 10.6 Responsive Behavior

Desktop:

- Sidebar permanen.
- Table dengan kolom lengkap.
- Chart ukuran penuh.

Tablet:

- Sidebar collapsible.
- Table dapat horizontal scroll.

Mobile:

- Sidebar menjadi drawer.
- Summary cards menjadi satu atau dua kolom.
- Tabel menggunakan compact layout.
- Form menjadi satu kolom.

## 10.7 UI States

Setiap halaman wajib mendukung:

| State         | Expected Behavior            |
| ------------- | ---------------------------- |
| Loading       | Skeleton                     |
| Empty         | Empty state + CTA            |
| Success       | Success feedback             |
| Error         | Clear error message          |
| Disabled      | Explain disabled reason      |
| No Permission | Access denied                |
| Pending       | Monitoring pending indicator |

## 10.8 Form UX

- Validasi langsung untuk format sederhana.
- Validasi server tetap wajib.
- Field sensitif menggunakan password input.
- Header dapat ditambahkan secara dinamis.
- Form dapat disimpan sebagai draft pada client jika dibutuhkan.
- Tampilkan contoh konfigurasi.

# 11. Error Handling

| Error                | Cause                         | System Response              |
| -------------------- | ----------------------------- | ---------------------------- |
| Invalid URL          | URL tidak valid               | Tampilkan validation error   |
| Unsupported protocol | Bukan HTTP/HTTPS              | Tolak konfigurasi            |
| SSRF blocked         | URL menuju alamat terlarang   | Tolak request                |
| DNS failure          | Host tidak ditemukan          | Failed check                 |
| Connection refused   | Server tidak menerima koneksi | Failed check                 |
| Timeout              | Request melewati batas waktu  | Timeout result               |
| HTTP 500             | Server error                  | Assertion/check failure      |
| HTTP 404             | Endpoint tidak ditemukan      | Assertion failure            |
| Invalid header       | Header tidak sesuai           | Assertion failure            |
| Body mismatch        | Isi body tidak sesuai         | Assertion failure            |
| Queue unavailable    | Redis down                    | Log error, alert operasional |
| Database unavailable | PostgreSQL down               | Retry atau fail safely       |
| Email failure        | Provider error                | Log and retry notification   |
| Unauthorized         | Session tidak valid           | HTTP 401                     |
| Forbidden            | Bukan pemilik data            | HTTP 403 atau 404            |
| Rate limited         | Request terlalu banyak        | HTTP 429                     |
| Payload too large    | Body melebihi limit           | Reject or truncate safely    |

## 11.1 Standard API Error Response

```
{
  "success": false,
  "error": {
    "code": "ENDPOINT_NOT_FOUND",
    "message": "Endpoint tidak ditemukan",
    "details": null
  }
}
```

## 11.2 Monitoring Result Error Codes

```
DNS_ERROR
CONNECTION_ERROR
TIMEOUT
TLS_ERROR
HTTP_STATUS_MISMATCH
HEADER_MISMATCH
BODY_MISMATCH
RESPONSE_TOO_LARGE
INVALID_CONFIGURATION
SSRF_BLOCKED
INTERNAL_ERROR
```

Error internal harus dibedakan dari kegagalan endpoint target.

# 12. Technical Architecture

Architecture Decision

&#x20;Modular Monolith + Dedicated Background Worker

## 12.1 Architecture Overview

APIWatch menggunakan satu repository dan satu codebase utama dengan beberapa runtime process.

Tidak menggunakan microservices.

Komponen:

1. Next.js Web Application.
2. Next.js Route Handlers.
3. PostgreSQL.
4. Redis.
5. BullMQ Scheduler/Queue.
6. Node.js Monitoring Worker.
7. Email Provider.

\#chatgpt-mermaid-\_r_97o\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_97o\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_97o\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_97o\_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-\_r_97o\_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_97o\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_97o\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_97o\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_97o\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_97o\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_97o\_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_97o\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_97o\_ p{margin:0;}#chatgpt-mermaid-\_r_97o\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ .cluster-label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ .cluster-label span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_97o\_ .label text,#chatgpt-mermaid-\_r_97o\_ span{fill:rgb(13, 13, 13);color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ .node rect,#chatgpt-mermaid-\_r_97o\_ .node circle,#chatgpt-mermaid-\_r_97o\_ .node ellipse,#chatgpt-mermaid-\_r_97o\_ .node polygon,#chatgpt-mermaid-\_r_97o\_ .node path{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .rough-node .label text,#chatgpt-mermaid-\_r_97o\_ .node .label text,#chatgpt-mermaid-\_r_97o\_ .image-shape .label,#chatgpt-mermaid-\_r_97o\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_97o\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .rough-node .label,#chatgpt-mermaid-\_r_97o\_ .node .label,#chatgpt-mermaid-\_r_97o\_ .image-shape .label,#chatgpt-mermaid-\_r_97o\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_97o\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_97o\_ .root .anchor path{fill:rgb(143, 143, 143)!important;stroke-width:0;stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_97o\_ .arrowheadPath{fill:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_97o\_ .edgePath .path{stroke:rgb(143, 143, 143);stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .flowchart-link{stroke:rgb(143, 143, 143);fill:none;}#chatgpt-mermaid-\_r_97o\_ .edgeLabel{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_97o\_ .edgeLabel p{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_97o\_ .edgeLabel rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_97o\_ .labelBkg{background-color:rgba(252, 252, 252, 0.5);}#chatgpt-mermaid-\_r_97o\_ .cluster rect{fill:rgb(243, 243, 243);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .cluster text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ .cluster span{color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:12px;background:rgb(243, 243, 243);border:1px solid rgba(0, 0, 0, 0.1);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_97o\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_97o\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_97o\_ .icon-shape,#chatgpt-mermaid-\_r_97o\_ .image-shape{background-color:rgb(252, 252, 252);text-align:center;}#chatgpt-mermaid-\_r_97o\_ .icon-shape p,#chatgpt-mermaid-\_r_97o\_ .image-shape p{background-color:rgb(252, 252, 252);padding:2px;}#chatgpt-mermaid-\_r_97o\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_97o\_ .image-shape .label rect{opacity:0.5;background-color:rgb(252, 252, 252);fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_97o\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_97o\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_97o\_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_97o\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_97o\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_97o\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_97o\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_97o\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_97o\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_97o\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_97o\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(0, 79, 153);}#chatgpt-mermaid-\_r_97o\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_97o\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_97o\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .node rect,#chatgpt-mermaid-\_r_97o\_ .node circle,#chatgpt-mermaid-\_r_97o\_ .node ellipse,#chatgpt-mermaid-\_r_97o\_ .node polygon,#chatgpt-mermaid-\_r_97o\_ .node path{fill:rgb(229, 243, 255);stroke:rgba(0, 0, 0, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_97o\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_97o\_ .mermaid-decision .label-container{fill:rgb(245, 250, 255);stroke:rgb(206, 219, 229);stroke-dasharray:2px,2px;}#chatgpt-mermaid-\_r_97o\_ .edgePaths .flowchart-link{stroke:rgb(143, 143, 143);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_97o\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_97o\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}User BrowserNext.js ApplicationRoute HandlersApplication ServicesPostgreSQLRedisBullMQ QueueNode.js Monitoring WorkerExternal HTTP APIsEmail Provider

## 12.2 Presentation Layer

Responsibility:

- Rendering pages.
- Rendering components.
- Handling user interactions.
- Displaying monitoring data.
- Form validation feedback.

Technology:

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.

Presentation layer tidak boleh menjalankan monitoring HTTP request langsung.

## 12.3 Application Layer

Responsibility:

- Use case orchestration.
- Endpoint creation.
- Endpoint update.
- Endpoint deletion.
- Manual monitoring trigger.
- History retrieval.
- Notification configuration.

Contoh:

```
CreateEndpoint
UpdateEndpoint
DeleteEndpoint
PauseEndpoint
ResumeEndpoint
TriggerManualCheck
GetEndpointHistory
GetDashboardSummary
```

## 12.4 Business Logic Layer

Responsibility:

- Monitoring rules.
- Status transitions.
- Response validation.
- Uptime calculation.
- Alert conditions.
- Monitoring configuration rules.

Contoh:

```
MonitoringService
HttpCheckService
ResponseValidator
EndpointStatusService
IncidentService
AlertService
```

## 12.5 Data Access Layer

Responsibility:

- Database queries.
- Entity persistence.
- Query filtering.
- Pagination.
- Transaction management.

Gunakan Prisma.

Jangan menempatkan query database langsung pada React component.

## 12.6 Infrastructure Layer

Responsibility:

- PostgreSQL connection.
- Redis connection.
- BullMQ.
- Email delivery.
- HTTP request execution.
- Logging.
- Environment configuration.

## 12.7 Backend Decision

Gunakan Next.js Route Handlers untuk API CRUD dan dashboard.

Contoh:

```
GET    /api/endpoints
POST   /api/endpoints
GET    /api/endpoints/:id
PATCH  /api/endpoints/:id
DELETE /api/endpoints/:id

POST   /api/endpoints/:id/pause
POST   /api/endpoints/:id/resume
POST   /api/endpoints/:id/check

GET    /api/endpoints/:id/history
GET    /api/dashboard/summary
GET    /api/reports
```

Worker terpisah dari Next.js:

```
apps/
  web/
  worker/
```

Keduanya menggunakan shared application modules dalam repository yang sama.

## 12.8 Why Dedicated Worker?

Monitoring membutuhkan:

- Continuous execution.
- Recurring scheduling.
- Concurrency management.
- Retry handling.
- Long-running jobs.
- Queue processing.
- Controlled resource usage.

Serverless function tidak menjadi pilihan utama untuk menjalankan monitoring scheduler yang selalu aktif.

Dedicated worker memungkinkan proses monitoring berjalan independen dari request browser.

## 12.9 Monitoring Job Lifecycle

```
Endpoint Created
      |
      v
Save to PostgreSQL
      |
      v
Register Scheduler
      |
      v
BullMQ Scheduler
      |
      v
Monitoring Queue
      |
      v
Worker Executes Check
      |
      v
Validate HTTP Response
      |
      v
Persist Check Result
      |
      v
Update Endpoint Status
      |
      v
Process Incident / Alert
```

## 12.10 Scheduler Strategy

Gunakan BullMQ Job Schedulers sesuai versi BullMQ yang dipilih.

Sebelum implementasi, validasi API dan behavior scheduler berdasarkan versi dependency yang benar-benar terinstal.

Ketentuan:

- Satu recurring scheduler per endpoint.
- Job ID deterministik.
- Scheduler dihapus ketika endpoint dihapus.
- Scheduler dinonaktifkan ketika endpoint paused.
- Scheduler diperbarui ketika interval berubah.
- Worker tidak membuat recurring schedule duplikat.
- Saat startup, jalankan reconciliation untuk membandingkan endpoint aktif di PostgreSQL dengan scheduler di Redis.

PostgreSQL menjadi source of truth. Redis menjadi infrastructure queue, bukan satu-satunya tempat menyimpan konfigurasi monitoring.

## 12.11 Monitoring Execution Rules

Worker wajib:

1. Mengambil endpoint configuration.
2. Memastikan endpoint masih aktif.
3. Memastikan config version sesuai.
4. Memvalidasi target URL.
5. Melakukan DNS resolution dan SSRF checks.
6. Mengirim request dengan timeout.
7. Mengukur response time.
8. Membaca response dalam batas ukuran.
9. Menjalankan assertions.
10. Menyimpan check result.
11. Memperbarui endpoint status.
12. Memproses incident transitions.
13. Mengantrekan notification jika diperlukan.

## 12.12 Monitoring Status Rules

Gunakan definisi sederhana:

- UP: check terbaru memenuhi seluruh aturan.
- DOWN: check terbaru gagal karena request atau assertion.
- PAUSED: monitoring dinonaktifkan.
- PENDING: belum ada hasil check.

Untuk MVP, satu kegagalan dapat mengubah status menjadi DOWN. Ambang kegagalan berulang dapat ditambahkan kemudian sebagai fitur P1.

## 12.13 Uptime Calculation

\\[ Uptime(\\%) = \frac{SuccessfulChecks}{TotalValidChecks}\times100 \\]

Contoh:

```
Total checks: 1000
Successful checks: 990
Failed checks: 10

Uptime = 99%
```

Untuk laporan berdasarkan periode waktu, jelaskan bahwa metode check-based uptime adalah estimasi berdasarkan sampel polling, bukan pengukuran downtime kontinu.

## 12.14 Retry Policy

Bedakan retry untuk:

- Job processing failure.
- Database temporary failure.
- Email delivery failure.
- Endpoint monitoring failure.

Jangan melakukan retry agresif terhadap target API yang sedang gagal karena dapat memperparah gangguan.

Untuk MVP:

- Monitoring failure dicatat sebagai hasil check.
- Retry queue hanya untuk kegagalan pemrosesan internal yang aman.
- Email retry menggunakan batas percobaan.
- Stalled job ditangani BullMQ.

## 12.15 Recommended Folder Structure

```
apiwatch/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── (auth)/
│   │   │   ├── dashboard/
│   │   │   └── api/
│   │   │
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── middleware.ts
│   │
│   └── worker/
│       └── src/
│           ├── jobs/
│           ├── processors/
│           ├── services/
│           └── index.ts
│
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── schemas/
│   │   └── constants/
│   │
│   ├── database/
│   │   ├── prisma/
│   │   └── src/
│   │
│   └── monitoring/
│       └── src/
│           ├── http/
│           ├── validation/
│           ├── security/
│           └── status/
│
├── docs/
│
├── docker/
│
├── scripts/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── docker-compose.yml
├── .env.example
└── PROJECT_PRD_AND_PLAYBOOK.md
```

Catatan: Gunakan pnpm workspace dan Turborepo hanya jika memang membantu pengelolaan dua aplikasi dan shared packages. Jangan menambahkan monorepo tooling yang tidak diperlukan. Struktur ini menjadi target arsitektur setelah dikonfirmasi pada Phase 2.

# 13. Data Model

## 13.1 Database Decision

Required

&#x20;PostgreSQL

PostgreSQL diperlukan karena APIWatch menyimpan data relasional:

- Users.
- Workspaces.
- Endpoints.
- Monitoring configurations.
- Monitoring results.
- Incidents.
- Notification settings.
- Notifications.

Redis tidak menggantikan PostgreSQL.

Redis digunakan untuk queue dan scheduling, sedangkan PostgreSQL menjadi sumber data permanen.

## 13.2 Entity Relationship

\#chatgpt-mermaid-\_r_98r\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;fill:rgb(13, 13, 13);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_98r\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_98r\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_98r\_ .error-icon{fill:rgb(243, 243, 243);}#chatgpt-mermaid-\_r_98r\_ .error-text{fill:rgb(13, 13, 13);stroke:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_98r\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_98r\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_98r\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_98r\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_98r\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_98r\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_98r\_ .marker{fill:rgb(143, 143, 143);stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_98r\_ .marker.cross{stroke:rgb(143, 143, 143);}#chatgpt-mermaid-\_r_98r\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;font-size:16px;}#chatgpt-mermaid-\_r_98r\_ p{margin:0;}#chatgpt-mermaid-\_r_98r\_ .entityBox{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r_98r\_ .relationshipLabelBox{fill:rgb(243, 243, 243);opacity:0.7;background-color:rgb(243, 243, 243);}#chatgpt-mermaid-\_r_98r\_ .relationshipLabelBox rect{opacity:0.5;}#chatgpt-mermaid-\_r_98r\_ .labelBkg{background-color:rgba(243, 243, 243, 0.5);}#chatgpt-mermaid-\_r_98r\_ .edgeLabel{background-color:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_98r\_ .edgeLabel .label rect{fill:rgb(252, 252, 252);}#chatgpt-mermaid-\_r_98r\_ .edgeLabel .label text{fill:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_98r\_ .edgeLabel .label{fill:rgb(83, 154, 248);font-size:14px;}#chatgpt-mermaid-\_r_98r\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;color:rgb(13, 13, 13);}#chatgpt-mermaid-\_r_98r\_ .edge-pattern-dashed{stroke-dasharray:8,8;}#chatgpt-mermaid-\_r_98r\_ .node rect,#chatgpt-mermaid-\_r_98r\_ .node circle,#chatgpt-mermaid-\_r_98r\_ .node ellipse,#chatgpt-mermaid-\_r_98r\_ .node polygon{fill:rgb(222, 234, 251);stroke:rgb(83, 154, 248);stroke-width:1px;}#chatgpt-mermaid-\_r_98r\_ .relationshipLine{stroke:rgb(143, 143, 143);stroke-width:1px;fill:none;}#chatgpt-mermaid-\_r_98r\_ .marker{fill:none!important;stroke:rgb(143, 143, 143)!important;stroke-width:1;}#chatgpt-mermaid-\_r_98r\_ [data-look=neo].labelBkg{background-color:rgba(243, 243, 243, 0.5);}#chatgpt-mermaid-\_r_98r\_ .node .neo-node{stroke:rgb(83, 154, 248);}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_98r\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_98r\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node .neo-line path{stroke:rgb(83, 154, 248);filter:none;}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_98r\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_98r\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_98r\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_98r\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_98r\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;}USERstringidPKstringemailUKstringpasswordHashdatetimecreatedAtWORKSPACEstringidPKstringownerIdFKstringnamedatetimecreatedAtENDPOINTstringidPKstringworkspaceIdFKstringnamestringurlstringmethodintintervalSecondsinttimeoutMsstringstatusbooleanisActiveintconfigVersionMONITORING_CHECKstringidPKstringendpointIdFKintstatusCodefloatresponseTimeMsbooleanisSuccessstringerrorCodedatetimecheckedAtINCIDENTstringidPKstringendpointIdFKstringstatusdatetimestartedAtdatetimeresolvedAtNOTIFICATION_SETTINGstringidPKstringworkspaceIdFKstringemailbooleanenabledNOTIFICATIONstringidPKstringincidentIdFKstringtypestringdeliveryStatusENDPOINT_DOCUMENTATIONstringidPKstringendpointIdFKstringdescriptionstringrequestExamplestringresponseExampleownscontainshasgeneratesconfigurestriggershas

## 13.3 Core Entities

### User

```
interface User {
  id: string;
  email: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Workspace

```
interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoint

```
type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD";

type EndpointStatus =
  | "UP"
  | "DOWN"
  | "PAUSED"
  | "PENDING";

interface Endpoint {
  id: string;
  workspaceId: string;
  name: string;
  url: string;
  method: HttpMethod;
  intervalSeconds: number;
  timeoutMs: number;
  status: EndpointStatus;
  isActive: boolean;
  configVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Monitoring Configuration

```
interface MonitoringConfiguration {
  endpointId: string;

  expectedStatusCodes: number[];

  requestHeaders: Record<string, string>;

  requestBody?: string;

  expectedHeaders?: Record<string, string>;

  expectedBodyContains?: string;

  expectedBodyNotContains?: string;

  followRedirects: boolean;

  maxResponseBytes: number;
}
```

Credential pada `requestHeaders` harus disimpan secara terenkripsi. Hindari menggunakan plain JSON untuk menyimpan secret.

### Monitoring Check

```
type CheckStatus =
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT"
  | "ERROR";

interface MonitoringCheck {
  id: string;
  endpointId: string;
  statusCode?: number;
  responseTimeMs?: number;
  isSuccess: boolean;
  status: CheckStatus;
  errorCode?: string;
  errorMessage?: string;
  assertionResults?: Record<string, boolean>;
  checkedAt: Date;
}
```

### Incident

```
interface Incident {
  id: string;
  endpointId: string;
  status: "OPEN" | "RESOLVED";
  startedAt: Date;
  resolvedAt?: Date;
  failureReason?: string;
}
```

## 13.4 Recommended Prisma Models

Implementasikan model berikut pada Phase 2 dan Phase 6:

```
User
Account
Session
VerificationToken
Workspace
Endpoint
MonitoringConfiguration
MonitoringCheck
Incident
NotificationSetting
Notification
EndpointDocumentation
```

Model `Account`, `Session`, dan `VerificationToken` dapat disesuaikan dengan adapter Auth.js yang digunakan.

## 13.5 Database Indexing

Wajib mempertimbangkan index:

```
User.email                          UNIQUE
Workspace.ownerId
Endpoint.workspaceId
Endpoint.isActive
MonitoringCheck.endpointId
MonitoringCheck.checkedAt
Incident.endpointId
Incident.status
Notification.incidentId
Notification.deliveryStatus
```

Composite index untuk histori:

```
(endpointId, checkedAt DESC)
```

## 13.6 Data Retention

Default MVP:

| Data                | Retention                       |
| ------------------- | ------------------------------- |
| User                | Until account deletion          |
| Endpoint            | Until deleted                   |
| Monitoring Check    | 30 days                         |
| Incident            | 90 days                         |
| Notification        | 90 days                         |
| Audit/security logs | According to operational policy |

Pembersihan data harus dilakukan menggunakan scheduled maintenance job, bukan ketika pengguna membuka dashboard.

# 14. Security & Privacy

## 14.1 Authentication Security

- Password hashing menggunakan Argon2id atau mekanisme hashing yang didukung oleh authentication library.
- Gunakan secure session cookies.
- Terapkan session expiration.
- Jangan menyimpan session token dalam localStorage.
- Lindungi authentication endpoints dengan rate limiting.
- Gunakan secure production cookie settings.

## 14.2 Authorization

Semua query yang berhubungan dengan data pengguna wajib memiliki ownership verification.

Contoh:

```
const endpoint = await prisma.endpoint.findFirst({
  where: {
    id: endpointId,
    workspace: {
      ownerId: userId,
    },
  },
});
```

Jangan mengambil data menggunakan `id` saja.

## 14.3 SSRF Protection

Critical Security Requirement

APIWatch menerima URL dari pengguna dan melakukan HTTP request ke URL tersebut. Hal ini membuat monitoring engine berpotensi disalahgunakan untuk Server-Side Request Forgery (SSRF).

Sistem wajib mencegah request ke:

- `127.0.0.0/8`.
- `10.0.0.0/8`.
- `172.16.0.0/12`.
- `192.168.0.0/16`.
- `169.254.0.0/16`.
- `::1`.
- IPv6 unique-local addresses.
- IPv4-mapped IPv6 private addresses.
- Cloud metadata endpoints.
- Host internal dan private network.
- Protocol selain HTTP/HTTPS.

Implementasi wajib:

1. Parse URL menggunakan URL API.
2. Validasi protocol.
3. Validasi hostname.
4. Resolve DNS.
5. Periksa seluruh hasil DNS.
6. Tolak alamat IP terlarang.
7. Cegah DNS rebinding dengan memastikan alamat IP yang dihubungi sesuai hasil validasi.
8. Validasi ulang setiap redirect.
9. Batasi jumlah redirect.
10. Gunakan egress firewall sebagai lapisan pertahanan tambahan.

Penting: Validasi DNS sebelum request saja tidak cukup. Implementasi HTTP client harus mengikat koneksi ke alamat IP yang sudah divalidasi atau menggunakan mekanisme egress proxy yang aman. Jangan membiarkan resolver HTTP melakukan resolusi ulang tanpa kontrol.

## 14.4 Request Security

- Batasi request headers.
- Blokir header hop-by-hop yang tidak diperlukan.
- Batasi ukuran request body.
- Batasi response body.
- Batasi timeout.
- Batasi concurrency.
- Jangan mengikuti redirect secara otomatis tanpa pemeriksaan SSRF ulang.
- Jangan mengirim credential ke host tujuan redirect yang berbeda.

## 14.5 Credential Protection

Credential seperti:

```
Authorization
X-API-Key
Cookie
Custom Secret Headers
```

Wajib:

- Dienkripsi sebelum disimpan.
- Encryption key berada di environment variables.
- Tidak dimasukkan ke Git.
- Tidak dikembalikan secara utuh dalam API response.
- Tidak dicatat pada application logs.
- Didekripsi hanya pada worker saat dibutuhkan.

Gunakan authenticated encryption seperti AES-256-GCM dengan key management yang benar.

## 14.6 Rate Limiting

Terapkan rate limiting pada:

- Login.
- Register.
- Create endpoint.
- Update endpoint.
- Manual check.
- Dashboard API.
- Notification trigger.

Untuk endpoint publik, gunakan rate limit berbasis IP. Untuk dashboard, gunakan user/workspace limits.

## 14.7 Environment Variables

Contoh:

```
NODE_ENV=development

DATABASE_URL=

REDIS_URL=

AUTH_SECRET=
AUTH_URL=

ENCRYPTION_KEY=

EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=

APP_URL=
```

Aturan:

- `.env` masuk `.gitignore`.
- `.env.example` boleh masuk Git.
- Tidak ada secret dalam source code.
- Production secrets disimpan di server environment.

## 14.8 Privacy Considerations

- Jangan menyimpan response body lengkap secara default.
- Hindari menyimpan data personal dari endpoint yang dimonitor.
- Batasi akses monitoring history.
- Sediakan penghapusan akun.
- Jelaskan data apa yang disimpan melalui Privacy Policy.
- Jangan mengklaim sertifikasi keamanan yang belum dimiliki.

# 15. Success Criteria

MVP dianggap selesai apabila seluruh kriteria berikut terpenuhi.

## 15.1 Functional Completion

- User dapat register.
- User dapat login dan logout.
- User dapat membuat endpoint.
- User dapat mengubah endpoint.
- User dapat menghapus endpoint.
- User dapat pause/resume monitoring.
- Worker melakukan monitoring otomatis.
- HTTP status dapat divalidasi.
- Response time tercatat.
- Expected headers dapat divalidasi.
- Response body dapat divalidasi.
- Monitoring history tersimpan.
- Endpoint status diperbarui.
- Email alert berfungsi.
- Dashboard menampilkan data aktual.

## 15.2 Security Completion

- Authentication bekerja.
- Authorization bekerja.
- SSRF protection diuji.
- Credential terenkripsi.
- Rate limiting aktif.
- Redis tidak terbuka ke publik.
- Secret tidak masuk Git.
- Cross-workspace access ditolak.

## 15.3 Operational Completion

- PostgreSQL berjalan.
- Redis berjalan.
- Web service berjalan.
- Worker service berjalan.
- Worker dapat restart.
- Scheduler reconciliation bekerja.
- Monitoring logs tersedia.
- Backup database dikonfigurasi.
- HTTPS aktif.
- Production smoke test lulus.

## 15.4 Product Readiness

- Landing page tersedia.
- Pricing page tersedia.
- Dashboard responsive.
- Empty state tersedia.
- Error state tersedia.
- Documentation tersedia.
- Privacy Policy tersedia.
- Terms of Service tersedia.

# 16. Risks & Technical Constraints

| Risk                      | Impact   | Mitigation                                               |
| ------------------------- | -------- | -------------------------------------------------------- |
| SSRF attack               | Critical | Strict URL validation, DNS pinning, egress controls      |
| Redis unavailable         | High     | Persistent Redis, monitoring, recovery                   |
| Worker crash              | High     | Process supervision, restart policy                      |
| Duplicate scheduler       | Medium   | Deterministic scheduler IDs and reconciliation           |
| Queue backlog             | High     | Concurrency limits and queue metrics                     |
| Excessive target requests | High     | Interval and quota enforcement                           |
| Large response body       | Medium   | Streaming size limit                                     |
| DNS rebinding             | Critical | Resolve-and-pin strategy                                 |
| Credential exposure       | Critical | Encryption and log redaction                             |
| Email delivery failure    | Medium   | Retry and delivery status                                |
| Database growth           | High     | Retention and indexes                                    |
| VPS bandwidth limits      | Medium   | Monitoring limits and capacity planning                  |
| False DOWN status         | Medium   | Clear failure classification and configurable thresholds |
| Version incompatibility   | Medium   | Lockfile and dependency validation                       |

## 16.1 Infrastructure Constraints

MVP menggunakan single VPS.

Komponen yang harus berjalan:

```
VPS
│
├── Caddy / Nginx
│
├── Next.js Web
│
├── Node.js Worker
│
├── PostgreSQL
│
└── Redis
```

Kebutuhan resource harus divalidasi berdasarkan jumlah endpoint, interval monitoring, response size, dan worker concurrency. Jangan menetapkan kapasitas produksi hanya berdasarkan perkiraan jumlah container.

## 16.2 Important Technical Decision

Monitoring worker harus memiliki batasan network egress.

Idealnya:

- Worker hanya boleh mengakses internet publik.
- Worker tidak boleh mengakses jaringan internal VPS.
- Database dan Redis hanya dapat diakses melalui private Docker network.
- Metadata endpoint cloud diblokir.
- DNS resolver dan outbound network dikontrol.

Ini merupakan bagian dari security architecture, bukan sekadar validasi form.

# PART B — SEQUENTIAL DEVELOPMENT PLAYBOOK

## Development Execution Strategy

Execution rules

- Tepat 10 phase.
- Satu phase pada satu waktu.
- Jangan melanjutkan otomatis.
- Setiap phase harus diuji.
- Setiap phase harus direview.
- Git checkpoint dilakukan setelah approval.
- Prompt AI Coding Assistant dijalankan satu per satu.

## PHASE 1 — Environment & Project Bootstrap

Foundation

&#x20;Estimated: 0.5–1 day

### 1. Phase Objective

Menyiapkan development environment dan project APIWatch agar siap digunakan untuk pengembangan selanjutnya.

Belum ada implementasi business logic.

### 2. Scope of Work

- Persiapan Node.js.
- Persiapan pnpm.
- Setup Git.
- Setup Next.js.
- Setup TypeScript.
- Setup Tailwind CSS.
- Setup shadcn/ui.
- Setup ESLint.
- Setup Prettier.
- Setup environment variables.
- Setup folder awal.
- Setup README.

### 3. Detailed Implementation Steps

Step 1 — Verify Development Tools

Pastikan tersedia:

- Node.js LTS yang kompatibel dengan Next.js.
- Corepack/pnpm.
- Git.
- VS Code.
- Browser modern.

Step 2 — Create Project

```
mkdir apiwatch
cd apiwatch

git init

corepack enable
pnpm create next-app@latest .
```

Saat installer menanyakan konfigurasi, pilih:

```
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src directory: Yes
App Router: Yes
Import alias: @/*
```

Untuk Turbopack, gunakan default yang direkomendasikan oleh versi Next.js yang dipilih.

Step 3 — Install Base Dependencies

```
pnpm add zod
pnpm add lucide-react
pnpm add date-fns
pnpm add recharts
```

Development dependencies:

```
pnpm add -D prettier prettier-plugin-tailwindcss
```

Jangan memasang Prisma, BullMQ, Redis client, atau Auth.js sebelum technical planning selesai.

Step 4 — Initialize shadcn/ui

```
pnpm dlx shadcn@latest init
```

Tambahkan komponen awal:

```
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add sonner
```

Validasi nama komponen dan CLI berdasarkan versi shadcn/ui yang digunakan.

Step 5 — Setup Git Ignore

Pastikan:

```
node_modules
.next
.env
.env.local
.env.production
dist
coverage
```

Step 6 — Create Environment Template

Buat `.env.example`:

```
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=
REDIS_URL=
AUTH_SECRET=
ENCRYPTION_KEY=
```

Step 7 — Create Initial README

Isi:

- Project description.
- Tech stack.
- Installation.
- Development commands.
- Environment setup.

### 4. Required Commands

```
node --version
pnpm --version
git --version

pnpm install

pnpm dev
```

Verifikasi:

```
pnpm lint
pnpm build
```

Jika script lint atau build berbeda akibat versi Next.js, sesuaikan `package.json`.

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Fullstack Developer.

Project: APIWatch – API Monitoring

Dokumen utama: PROJECT_PRD_AND_PLAYBOOK.md

Task: PHASE 1 — Environment & Project Bootstrap.

Baca bagian PRD dan Phase 1 pada dokumen utama terlebih dahulu.

TUJUAN:

Menyiapkan project Next.js yang bersih, stabil, dan siap dikembangkan.

IMPLEMENTASI:

1. Periksa kondisi folder dan file yang sudah tersedia.
2. Setup Next.js App Router menggunakan TypeScript.
3. Pastikan Tailwind CSS berjalan.
4. Setup shadcn/ui.
5. Setup ESLint dan Prettier.
6. Tambahkan dependency dasar yang memang dibutuhkan.
7. Buat .env.example.
8. Pastikan .env masuk .gitignore.
9. Buat README.md awal.
10. Verifikasi development server, lint, dan production build.

BATASAN:

- Jangan implementasikan monitoring engine.
- Jangan membuat database integration.
- Jangan membuat Redis integration.
- Jangan membuat authentication.
- Jangan membuat dashboard business logic.
- Jangan menambahkan dependency yang tidak diperlukan.
- Jangan mengubah teknologi utama tanpa persetujuan.
- Jangan melanjutkan ke Phase 2.

EXPECTED FILES:

- package.json
- pnpm-lock.yaml
- tsconfig.json
- next.config.ts
- .env.example
- .gitignore
- README.md
- src/app/
- konfigurasi Tailwind dan shadcn/ui
- konfigurasi ESLint/Prettier

ACCEPTANCE CRITERIA:

- Next.js dapat dijalankan.
- TypeScript berjalan.
- Tailwind berjalan.
- shadcn/ui berhasil digunakan.
- ESLint berhasil dijalankan.
- Production build berhasil.

REPORT:

Laporkan file yang dibuat/diubah, dependency, command yang dijalankan, hasil aktual testing, dan masalah yang ditemukan.

Jangan mengklaim testing berhasil apabila command tidak benar-benar dijalankan.

### 6. Expected Deliverables

- Next.js project.
- TypeScript configuration.
- Tailwind configuration.
- shadcn/ui.
- ESLint and Prettier.
- `.env.example`.
- README.
- Initial Git repository.

### 7. Acceptance Criteria

- Project berhasil di-install.
- `pnpm dev` berjalan.
- Homepage dapat dibuka.
- TypeScript tidak error.
- Tailwind berfungsi.
- shadcn/ui dapat digunakan.
- Lint berhasil.
- Production build berhasil.
- Tidak ada secret di repository.

### 8. Testing Requirements

```
pnpm install
pnpm lint
pnpm build
pnpm dev
```

Buka:

```
http://localhost:3000
```

### 9. Git Checkpoint

Setelah semua kriteria lulus dan perubahan direview:

```
git add .
git commit -m "phase 1: project bootstrap"
```

## PHASE 2 — Technical Planning & Architecture

Architecture

&#x20;Estimated: 1 day

### 1. Phase Objective

Menentukan arsitektur teknis final sebelum mengimplementasikan fitur utama.

Phase ini menghasilkan `TECHNICAL_PLAN.md`.

Tidak mengimplementasikan business features.

### 2. Scope of Work

- Analisis PRD.
- Finalisasi folder structure.
- Menentukan application architecture.
- Menentukan worker architecture.
- Menentukan database.
- Menentukan queue.
- Menentukan authentication.
- Menentukan API contracts.
- Menentukan monitoring engine.
- Menentukan security architecture.
- Menentukan deployment architecture.
- Menentukan dependency.

### 3. Detailed Implementation Steps

Step 1 — Analyze Requirements

Identifikasi:

- P0 features.
- P1 features.
- User flows.
- Security requirements.
- Background processing requirements.

Step 2 — Finalize Architecture

Keputusan awal:

```
Next.js
  |
  | REST API
  |
Application Services
  |
PostgreSQL

Redis
  |
BullMQ
  |
Node.js Worker
  |
HTTP Monitoring Engine
```

Step 3 — Select Database Tools

Rekomendasi:

```
PostgreSQL
Prisma ORM
```

Step 4 — Select Queue Tools

Rekomendasi:

```
Redis
BullMQ
```

Validasi:

- Scheduler API.
- Job repeat behavior.
- Retry.
- Job ID.
- Graceful shutdown.
- Redis connection configuration.

Step 5 — Define Monitoring Engine

Tentukan:

- HTTP request lifecycle.
- Timeout.
- Redirect handling.
- DNS validation.
- SSRF protection.
- Response body limits.
- Header assertions.
- Body assertions.
- Response time measurement.

Step 6 — Define API Contract

Tentukan endpoint REST, request schema, response schema, dan error codes.

Step 7 — Define Data Model

Buat ERD dan schema draft.

Step 8 — Define Security Architecture

Prioritaskan SSRF dan credential encryption.

Step 9 — Define Deployment

Tentukan:

- Docker Compose.
- Web container.
- Worker container.
- PostgreSQL.
- Redis.
- Reverse proxy.
- Persistent volumes.

Step 10 — Document Technical Risks

Buat daftar dependency dan risiko.

### 4. Required Commands

Cek kondisi project:

```
tree -L 3
```

Jika `tree` tidak tersedia:

```
find . -maxdepth 3 -type f
```

Periksa package:

```
cat package.json
pnpm list
```

Validasi versi library:

```
pnpm view bullmq version
pnpm view prisma version
pnpm view next version
```

Periksa dokumentasi resmi library yang dipilih sebelum menetapkan API implementasi.

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Software Architect.

Project: APIWatch – API Monitoring.

Task: PHASE 2 — Technical Planning & Architecture.

Baca PROJECT_PRD_AND_PLAYBOOK.md dan periksa seluruh kondisi repository.

TUJUAN:

Buat dokumen TECHNICAL_PLAN.md sebagai panduan implementasi teknis APIWatch.

SCOPE:

1. Analisis kebutuhan P0 dan P1.
2. Finalisasi modular monolith architecture.
3. Tentukan batas Next.js dan dedicated worker.
4. Tentukan shared packages jika dibutuhkan.
5. Finalisasi folder structure.
6. Tentukan PostgreSQL schema dan ERD.
7. Tentukan Prisma configuration.
8. Tentukan Redis dan BullMQ architecture.
9. Tentukan scheduler lifecycle.
10. Tentukan worker lifecycle.
11. Tentukan HTTP monitoring methodology.
12. Tentukan SSRF protection strategy.
13. Tentukan credential encryption strategy.
14. Tentukan API contracts.
15. Tentukan validation strategy.
16. Tentukan logging dan error handling.
17. Tentukan testing architecture.
18. Tentukan deployment architecture.
19. Tentukan dependency beserta alasan penggunaannya.
20. Dokumentasikan technical risks.

OUTPUT:

Buat TECHNICAL_PLAN.md dengan:

- Architecture overview.
- Architecture diagram.
- Folder structure.
- Data flow.
- Database design.
- API specification.
- Worker design.
- Scheduler design.
- Monitoring lifecycle.
- Security design.
- Environment variables.
- Dependencies.
- Testing strategy.
- Deployment strategy.
- Technical decisions.

BATASAN:

- Jangan implementasikan fitur utama.
- Jangan membuat database migration.
- Jangan membuat worker production.
- Jangan membuat API business logic.
- Jangan menambahkan dependency hanya karena populer.
- Jangan menggunakan microservices.
- Jangan menggunakan serverless untuk continuous worker.
- Jangan mengasumsikan BullMQ API tanpa memeriksa versi.
- Jangan melanjutkan ke Phase 3.

ACCEPTANCE:

TECHNICAL_PLAN.md harus konsisten dengan PRD dan dapat digunakan AI Coding Assistant pada phase selanjutnya.

REPORT:

Laporkan keputusan arsitektur, dependency yang direkomendasikan, risiko, file dokumentasi, dan bagian yang masih memerlukan konfirmasi.

### 6. Expected Deliverables

- `TECHNICAL_PLAN.md`.
- Architecture diagram.
- Database ERD.
- API specification.
- Worker flow.
- Security decisions.
- Dependency list.
- Technical risk register.

### 7. Acceptance Criteria

- Arsitektur frontend jelas.
- Arsitektur backend jelas.
- Worker terpisah dari web.
- Queue lifecycle terdokumentasi.
- Scheduler strategy terdokumentasi.
- Database design jelas.
- API contracts jelas.
- SSRF strategy jelas.
- Credential encryption strategy jelas.
- Deployment architecture jelas.
- Tidak ada fitur di luar PRD yang masuk scope.

### 8. Testing Requirements

Tidak ada feature test.

Lakukan pemeriksaan dokumentasi:

```
test -f TECHNICAL_PLAN.md
```

Review konsistensi:

- PRD versus technical plan.
- API contracts versus data model.
- Worker versus scheduler.
- Security versus HTTP execution.
- Development versus deployment.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 2: technical architecture"
```

## PHASE 3 — UI/UX Planning & Design System

Product Design

&#x20;Estimated: 1 day

### 1. Phase Objective

Membuat panduan UI/UX dan design system APIWatch sebelum implementasi frontend.

Hasil utama: `UI_UX_GUIDE.md`.

### 2. Scope of Work

- Design direction.
- Color tokens.
- Typography.
- Spacing.
- Navigation.
- Dashboard layout.
- Endpoint listing.
- Endpoint creation form.
- Endpoint detail.
- History.
- Reports.
- Empty states.
- Loading states.
- Responsive behavior.
- Accessibility.

### 3. Detailed Implementation Steps

Step 1 — Define Visual Identity

Karakter:

- Developer-focused.
- Modern.
- Minimal.
- Professional.
- Data-oriented.

Step 2 — Define Design Tokens

Contoh:

```
Primary
Background
Surface
Foreground
Muted
Border
Success
Warning
Danger
```

Step 3 — Define Typography

```
Heading: Geist / Inter
Body: Geist / Inter
Code: Geist Mono
```

Step 4 — Define Layout

Dashboard:

```
Sidebar | Header
        | Content
        | Charts
        | Tables
```

Step 5 — Define Page Wireframes

Minimal:

- Dashboard.
- Endpoint list.
- Endpoint creation.
- Endpoint detail.
- Monitoring history.
- Reports.
- Settings.

Step 6 — Define Component Library

- Status badge.
- Stat card.
- Endpoint table.
- Response chart.
- Monitoring timeline.
- Form field.
- Dialog.
- Toast.
- Empty state.
- Error state.

Step 7 — Define Responsive Rules

Desktop, tablet, mobile.

Step 8 — Document UI/UX

Semua keputusan masuk `UI_UX_GUIDE.md`.

### 4. Required Commands

```
find src -maxdepth 4 -type f
```

Tidak perlu menambah dependency untuk phase desain.

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Product Designer dan Frontend Architect.

Project: APIWatch.

Task: PHASE 3 — UI/UX Planning & Design System.

Baca:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md

TUJUAN:

Membuat UI_UX_GUIDE.md sebagai panduan implementasi desain APIWatch.

SCOPE:

1. Tentukan visual identity.
2. Tentukan color system.
3. Tentukan typography.
4. Tentukan spacing system.
5. Tentukan border radius dan shadow.
6. Tentukan dashboard layout.
7. Tentukan navigation.
8. Tentukan halaman public.
9. Tentukan halaman authentication.
10. Tentukan halaman dashboard.
11. Tentukan endpoint management UI.
12. Tentukan endpoint detail UI.
13. Tentukan monitoring history UI.
14. Tentukan report UI.
15. Tentukan reusable components.
16. Tentukan responsive behavior.
17. Tentukan loading, empty, success, dan error states.
18. Tentukan accessibility requirements.

OUTPUT:

Buat UI_UX_GUIDE.md yang berisi design tokens, page specifications, component specifications, layout rules, responsive rules, dan wireframe berbasis teks atau Mermaid.

BATASAN:

- Jangan implementasikan halaman.
- Jangan mengubah project configuration.
- Jangan menambahkan dependency.
- Jangan membuat business logic.
- Jangan membuat mock API.
- Jangan melanjutkan ke Phase 4.

ACCEPTANCE:

Seluruh halaman P0 memiliki spesifikasi UI yang jelas dan konsisten dengan PRD serta TECHNICAL_PLAN.md.

REPORT:

Laporkan desain yang ditentukan, komponen yang direncanakan, file dokumentasi, dan keputusan yang masih belum pasti.

### 6. Expected Deliverables

- `UI_UX_GUIDE.md`.
- Design tokens.
- Page specifications.
- Component specifications.
- Navigation specification.
- Responsive guidelines.
- State specifications.

### 7. Acceptance Criteria

- Design system terdokumentasi.
- Dashboard layout ditentukan.
- Semua halaman P0 memiliki spesifikasi.
- Navigation ditentukan.
- Responsive behavior ditentukan.
- Status design konsisten.
- Loading dan error states terdokumentasi.
- Accessibility dipertimbangkan.

### 8. Testing Requirements

Dokumentasi review:

- UI consistency.
- Design token consistency.
- PRD alignment.
- Responsive completeness.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 3: ui ux planning"
```

## PHASE 4 — Frontend Foundation & Application Shell

Frontend Foundation

&#x20;Estimated: 1–2 days

### 1. Phase Objective

Mengimplementasikan struktur frontend, layout, navigation, design system, dan routing dasar.

Belum mengimplementasikan monitoring business logic.

### 2. Scope of Work

- Final folder structure.
- Public layout.
- Authentication layout.
- Dashboard layout.
- Sidebar.
- Navbar.
- Footer.
- Breadcrumb.
- Theme support jika dipilih.
- Reusable components.
- Basic routing.
- Global styles.

### 3. Detailed Implementation Steps

Step 1 — Implement Final Folder Structure

Ikuti `TECHNICAL_PLAN.md`.

Step 2 — Implement Global Styles

- CSS variables.
- Color tokens.
- Typography.
- Spacing.
- Global reset.

Step 3 — Implement Public Layout

```
Navbar
Main Content
Footer
```

Step 4 — Implement Dashboard Layout

```
Sidebar
Header
Breadcrumb
Main Content
```

Step 5 — Implement Reusable Components

Minimal:

```
StatCard
StatusBadge
PageHeader
EmptyState
ErrorState
LoadingSkeleton
ConfirmDialog
```

Step 6 — Implement Routes

Buat halaman kosong atau placeholder yang memiliki layout sesuai desain.

Step 7 — Implement Responsive Layout

Pastikan sidebar, header, dan navigation berjalan pada mobile.

Step 8 — Implement Navigation

Gunakan Next.js Link.

### 4. Required Commands

Tambahkan komponen shadcn/ui yang dibutuhkan:

```
pnpm dlx shadcn@latest add sidebar
pnpm dlx shadcn@latest add breadcrumb
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add tooltip
```

Jalankan:

```
pnpm lint
pnpm build
pnpm dev
```

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Frontend Developer.

Project: APIWatch.

Task: PHASE 4 — Frontend Foundation & Application Shell.

Baca:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md

TUJUAN:

Implementasikan fondasi frontend APIWatch sesuai arsitektur dan desain yang telah ditentukan.

SCOPE:

1. Implementasikan final frontend folder structure.
2. Implementasikan global styles.
3. Implementasikan design tokens.
4. Implementasikan public layout.
5. Implementasikan authentication layout.
6. Implementasikan dashboard layout.
7. Implementasikan sidebar.
8. Implementasikan header.
9. Implementasikan breadcrumb.
10. Implementasikan footer.
11. Implementasikan reusable UI components.
12. Implementasikan basic routes.
13. Implementasikan responsive navigation.
14. Implementasikan loading, empty, dan error components.

EXPECTED FILES:

- src/app/
- src/components/
- src/components/layout/
- src/components/shared/
- src/lib/
- src/styles/ jika dibutuhkan.

BATASAN:

- Jangan membuat monitoring engine.
- Jangan mengimplementasikan database.
- Jangan membuat API integration.
- Jangan membuat authentication backend.
- Jangan membuat scheduler.
- Jangan membuat worker.
- Jangan menggunakan data dummy sebagai data production.
- Jangan mengimplementasikan business logic utama.

ACCEPTANCE:

- Seluruh route dapat dibuka.
- Layout konsisten.
- Navigation berfungsi.
- Responsive.
- Reusable components dapat digunakan.
- TypeScript tidak error.
- Lint dan build berhasil.

REPORT:

Laporkan semua file yang dibuat dan diubah, komponen yang tersedia, dependency tambahan, serta hasil testing aktual.

Jangan lanjut Phase 5.

### 6. Expected Deliverables

- Frontend folder structure.
- Global layout.
- Dashboard shell.
- Public shell.
- Navigation.
- Reusable components.
- Basic pages.
- Responsive styles.

### 7. Acceptance Criteria

- Public layout berfungsi.
- Dashboard layout berfungsi.
- Sidebar berfungsi.
- Header berfungsi.
- Navigation berfungsi.
- Responsive layout.
- Global styles konsisten.
- Tidak ada business logic monitoring.
- Lint berhasil.
- Build berhasil.

### 8. Testing Requirements

```
pnpm lint
pnpm build
pnpm dev
```

Verifikasi:

- Desktop.
- Tablet.
- Mobile.
- Navigation.
- Component rendering.
- Console errors.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 4: frontend foundation"
```

## PHASE 5 — Core Frontend Feature Development

Core Frontend

&#x20;Estimated: 2–3 days

### 1. Phase Objective

Membangun seluruh core UI APIWatch menggunakan mock data yang terkontrol.

Phase ini fokus pada tampilan dan interaksi frontend.

Backend belum menjadi sumber data utama.

### 2. Scope of Work

- Dashboard overview.
- Endpoint list.
- Endpoint creation form.
- Endpoint edit form.
- Endpoint detail.
- Monitoring history.
- Basic reports.
- Notification settings.
- Form validation.
- UI state.
- Zustand jika dibutuhkan.

### 3. Detailed Implementation Steps

Step 1 — Dashboard Overview

Tampilkan:

- Total endpoints.
- UP count.
- DOWN count.
- Average response time.
- Recent incidents.
- Response time chart.

Step 2 — Endpoint List

Fitur:

- Search.
- Filter.
- Status badge.
- Add endpoint.
- Edit.
- Delete.
- Pause/resume UI.

Step 3 — Endpoint Creation Form

Fields:

- Name.
- URL.
- Method.
- Interval.
- Timeout.
- Expected status.
- Request headers.
- Expected headers.
- Expected body.

Gunakan Zod untuk client-side validation dengan schema yang nantinya dapat digunakan ulang di backend.

Step 4 — Endpoint Detail

Tampilkan:

- Endpoint information.
- Status.
- Response time.
- Configuration.
- Monitoring history.
- Documentation.

Step 5 — History

Tampilkan:

- Timestamp.
- Status code.
- Response time.
- Result.
- Error message.

Step 6 — Reports

Tampilkan:

- Availability.
- Average latency.
- Minimum latency.
- Maximum latency.
- Total checks.

Step 7 — Notification Settings

Implementasikan email notification preferences UI.

Step 8 — Mock Data Boundaries

Buat:

```
src/features/
  dashboard/
    mock/
  endpoints/
    mock/
  history/
    mock/
```

Gunakan interface yang konsisten dengan API contract.

Mock hanya boleh dipakai sebagai frontend development fixture. Jangan gunakan mock sebagai fallback ketika backend gagal pada Phase 7.

### 4. Required Commands

```
pnpm add react-hook-form @hookform/resolvers
```

Jika React Hook Form belum menjadi dependency.

Jalankan:

```
pnpm lint
pnpm build
```

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Frontend Engineer.

Project: APIWatch.

Task: PHASE 5 — Core Frontend Feature Development.

Baca:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md

TUJUAN:

Implementasikan seluruh core frontend features APIWatch menggunakan mock data yang terisolasi.

SCOPE:

1. Dashboard overview.
2. Stat cards.
3. Endpoint list.
4. Endpoint creation form.
5. Endpoint edit form.
6. Endpoint detail page.
7. Monitoring history table.
8. Response time chart.
9. Basic reports page.
10. Notification settings UI.
11. Endpoint documentation UI.
12. Form validation.
13. Loading states.
14. Empty states.
15. Error states.
16. Success feedback.
17. Responsive behavior.

TECHNICAL RULES:

- Gunakan TypeScript.
- Gunakan shadcn/ui.
- Gunakan React Hook Form dan Zod apabila dibutuhkan.
- Gunakan Zustand hanya untuk shared state yang memang diperlukan.
- Gunakan server/client components secara tepat.
- Hindari global state untuk state form lokal.
- Gunakan typed mock services.

MOCK DATA RULES:

- Pisahkan mock data dari business components.
- Beri nama file dengan jelas.
- Jangan menganggap mock sebagai backend production.
- Jangan menyembunyikan backend errors dengan mock fallback.
- Siapkan interface agar dapat diganti real API service pada Phase 7.

BATASAN:

- Jangan implementasikan backend.
- Jangan implementasikan database.
- Jangan implementasikan Redis.
- Jangan implementasikan monitoring worker.
- Jangan membuat real scheduler.
- Jangan mengirim monitoring request ke endpoint pengguna dari browser.

ACCEPTANCE:

Seluruh core pages dapat digunakan secara visual dan interaktif menggunakan mock fixtures.

OUTPUT:

Laporkan halaman, komponen, form, validation schema, mock files, dependency, dan hasil testing.

Jangan lanjut ke Phase 6.

### 6. Expected Deliverables

- Dashboard.
- Endpoint management UI.
- Endpoint forms.
- Endpoint detail.
- History page.
- Reports page.
- Notification settings.
- Mock fixtures.
- Validation schemas.

### 7. Acceptance Criteria

- Dashboard tampil.
- Endpoint list berfungsi.
- Search dan filter berfungsi pada mock data.
- Create form tervalidasi.
- Edit form berfungsi.
- Detail page tampil.
- History table tampil.
- Chart tampil.
- Notification settings UI tersedia.
- Responsive.
- Mock terisolasi.
- Build berhasil.

### 8. Testing Requirements

```
pnpm lint
pnpm build
```

Manual:

- Form validation.
- Search.
- Filter.
- Modal.
- Delete confirmation.
- Responsive layout.
- Empty state.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 5: core frontend features"
```

## PHASE 6 — Backend & Core Business Logic

Critical Implementation

&#x20;Estimated: 4–7 days

### 1. Phase Objective

Mengimplementasikan backend, database, authentication, queue, scheduler, monitoring engine, security, dan notification system.

Ini merupakan phase dengan kompleksitas teknis tertinggi.

### 2. Scope of Work

- PostgreSQL.
- Prisma.
- Authentication.
- REST API.
- Application services.
- Database repositories.
- Redis.
- BullMQ.
- Node.js worker.
- Monitoring scheduler.
- HTTP monitoring engine.
- Response validation.
- SSRF protection.
- Credential encryption.
- Monitoring history.
- Status transitions.
- Incident management.
- Email notifications.
- Logging.

### 3. Detailed Implementation Steps

Step 1 — Install Backend Dependencies

Contoh dependency:

```
pnpm add @prisma/client
pnpm add prisma
pnpm add bullmq ioredis
pnpm add argon2
pnpm add nodemailer
pnpm add @auth/prisma-adapter next-auth
```

Tambahkan hanya package yang sesuai dengan keputusan final `TECHNICAL_PLAN.md`.

Gunakan versi stabil yang kompatibel dan commit lockfile.

Step 2 — Configure PostgreSQL

Setup Prisma:

```
pnpm prisma init
```

Buat schema dan migration:

```
pnpm prisma migrate dev --name init
pnpm prisma generate
```

Step 3 — Implement Authentication

Implementasikan:

- Registration.
- Login.
- Logout.
- Session validation.
- Protected dashboard routes.
- Ownership verification.

Jika menggunakan Auth.js, ikuti adapter dan API yang sesuai dengan versi terinstal. Jangan mencampur API versi lama dan baru.

Step 4 — Implement Database Access

Buat repository:

```
EndpointRepository
MonitoringCheckRepository
IncidentRepository
NotificationRepository
WorkspaceRepository
```

Step 5 — Implement Endpoint CRUD API

```
GET    /api/endpoints
POST   /api/endpoints
GET    /api/endpoints/[id]
PATCH  /api/endpoints/[id]
DELETE /api/endpoints/[id]
```

Tambahkan:

- Zod validation.
- Ownership verification.
- Error handling.
- Pagination.

Step 6 — Implement Redis and BullMQ

Buat queue:

```
monitoringQueue
notificationQueue
```

Buat scheduler service.

Pastikan recurring job tidak terduplikasi dan dapat direkonsiliasi dengan database.

Step 7 — Implement HTTP Monitoring Engine

Buat module:

```
monitoring/
  http-client.ts
  response-validator.ts
  request-timer.ts
  url-security.ts
  result-normalizer.ts
```

Monitoring engine harus:

- Mendukung HTTP/HTTPS.
- Mendukung method yang ditetapkan.
- Mengukur response time.
- Memiliki timeout.
- Memvalidasi status code.
- Memvalidasi header.
- Memvalidasi body.
- Membatasi response size.
- Menangani redirect dengan aman.

Step 8 — Implement SSRF Protection

Ini harus selesai sebelum worker melakukan request terhadap URL yang diberikan pengguna.

Buat:

- URL validator.
- IP range validator.
- DNS resolver.
- DNS pinning strategy.
- Redirect validation.
- Egress restriction documentation.

Lakukan pengujian terhadap IPv4, IPv6, private IP, loopback, metadata endpoints, dan DNS rebinding.

Step 9 — Implement Monitoring Worker

Worker menjalankan:

- Job retrieval.
- Configuration loading.
- Security validation.
- HTTP execution.
- Assertion validation.
- Result persistence.
- Status update.
- Incident transitions.

Step 10 — Implement Monitoring History

Simpan hasil check dengan pagination dan indexing yang sesuai.

Step 11 — Implement Incident Management

Buat lifecycle:

```
No Incident
    |
    v
DOWN Detected
    |
    v
Incident Open
    |
    v
Recovery Detected
    |
    v
Incident Resolved
```

Gunakan transaction atau mekanisme concurrency control untuk menghindari incident ganda.

Step 12 — Implement Email Notification

Buat:

- Email template.
- Notification service.
- Queue processor.
- Retry.
- Delivery status.

Step 13 — Implement Manual Check

Manual check harus menggunakan queue dan batas concurrency yang sama, bukan melakukan HTTP request langsung pada route handler.

Step 14 — Implement Operational Logging

Gunakan structured logs.

Jangan mencatat:

- Authorization header.
- API keys.
- Password.
- Session cookies.
- Encryption keys.

### 4. Required Commands

Database:

```
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate dev
```

Redis lokal jika sudah tersedia:

```
docker compose up -d redis postgres
```

Worker development command harus disediakan sesuai script yang dipilih.

Contoh:

```
pnpm --filter worker dev
```

Validasi:

```
pnpm lint
pnpm build
```

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Backend Engineer dan Security Engineer.

Project: APIWatch – API Monitoring.

Task: PHASE 6 — Backend & Core Business Logic.

WAJIB BACA:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md

Periksa repository dan implementasi Phase 1–5 sebelum mengubah file.

TUJUAN:

Membangun backend production-oriented APIWatch termasuk monitoring engine dan background worker.

IMPLEMENTATION ORDER:

1. Database configuration.
2. Prisma schema.
3. Database migrations.
4. Authentication.
5. Authorization.
6. Repository layer.
7. Application services.
8. Endpoint CRUD API.
9. Input validation.
10. Redis connection.
11. BullMQ queues.
12. Monitoring scheduler.
13. HTTP monitoring engine.
14. Response time measurement.
15. HTTP status validation.
16. Header validation.
17. Body validation.
18. SSRF protection.
19. Credential encryption.
20. Monitoring worker.
21. Monitoring history persistence.
22. Endpoint status transitions.
23. Incident management.
24. Email notification.
25. Manual check queue.
26. Logging.
27. Error handling.

CRITICAL SECURITY:

- Jangan melakukan monitoring request tanpa SSRF protection.
- Blokir private, loopback, link-local, dan metadata addresses.
- Tangani DNS rebinding.
- Validasi setiap redirect.
- Batasi response size.
- Batasi timeout.
- Jangan membocorkan credentials melalui logs.
- Enkripsi secret headers.
- Pastikan workspace ownership pada seluruh API.
- Redis dan PostgreSQL tidak boleh diekspos ke publik.

ARCHITECTURE:

- Next.js Route Handlers untuk CRUD API.
- Dedicated Node.js worker untuk monitoring.
- PostgreSQL sebagai source of truth.
- Redis + BullMQ untuk job processing.
- Shared TypeScript modules jika diperlukan.
- Jangan menggunakan microservices.

SCHEDULER:

- Gunakan scheduler API sesuai BullMQ versi terinstal.
- Job ID harus deterministik.
- Hindari duplicate scheduler.
- Sediakan reconciliation.
- Endpoint paused tidak boleh dijadwalkan.
- Endpoint deleted tidak boleh diproses kembali.

BATASAN:

- Jangan mengerjakan frontend integration.
- Jangan mengimplementasikan billing.
- Jangan mengimplementasikan multi-region.
- Jangan membuat fitur P2.
- Jangan melanjutkan Phase 7.
- Jangan menganggap fitur selesai tanpa testing.

ACCEPTANCE:

Semua backend P0 dapat diuji secara independen.

WAJIB LAPORKAN:

- File yang dibuat dan diubah.
- Database models.
- Migration.
- API endpoints.
- Worker architecture.
- Queue and scheduler implementation.
- Security implementation.
- Dependency.
- Environment variables.
- Command testing.
- Hasil testing aktual.
- Known issues.

Jika ada implementasi security yang belum aman, jangan menyatakan worker siap production.

### 6. Expected Deliverables

- Prisma schema.
- Database migration.
- Authentication.
- REST API.
- Repository layer.
- Application services.
- Redis connection.
- BullMQ queues.
- Monitoring scheduler.
- Monitoring worker.
- HTTP monitoring engine.
- SSRF protection.
- Credential encryption.
- Monitoring history.
- Incident handling.
- Email notification.
- Structured logging.

### 7. Acceptance Criteria

- PostgreSQL berjalan.
- Prisma migration berhasil.
- Authentication berfungsi.
- Authorization berfungsi.
- Endpoint CRUD API berfungsi.
- Redis connection berfungsi.
- BullMQ berfungsi.
- Scheduler berjalan.
- Worker dapat memproses monitoring job.
- HTTP status validation berfungsi.
- Response time tercatat.
- Header validation berfungsi.
- Body validation berfungsi.
- Timeout terdeteksi.
- SSRF protection diuji.
- Credential terenkripsi.
- Monitoring history tersimpan.
- Status transitions benar.
- Incident tidak terduplikasi.
- Email notification berfungsi.
- Worker dapat restart dengan aman.

### 8. Testing Requirements

Unit test:

- URL validation.
- IP validation.
- Response validator.
- Status transition.
- Uptime calculation.
- Credential encryption/decryption.

Integration test:

- Database.
- Authentication.
- CRUD API.
- Redis.
- Queue.
- Worker.
- Scheduler.
- Email notification.

Security test:

- Private IP blocking.
- Loopback blocking.
- IPv6 blocking.
- Metadata blocking.
- Redirect validation.
- DNS rebinding resistance.
- Cross-workspace access.
- Secret redaction.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 6: backend implementation"
```

## PHASE 7 — Frontend & Backend Integration

End-to-End Integration

&#x20;Estimated: 2–3 days

### 1. Phase Objective

Menghubungkan seluruh frontend dengan backend APIWatch sehingga mock data digantikan oleh data aktual dari PostgreSQL.

Seluruh core user flow harus bekerja secara end-to-end.

### 2. Scope of Work

- API client.
- Data fetching.
- Dashboard integration.
- Endpoint CRUD integration.
- Monitoring history integration.
- Reports integration.
- Authentication integration.
- Session management.
- Notification settings integration.
- Manual check integration.
- Error mapping.
- Loading states.
- Retry behavior.

### 3. Detailed Implementation Steps

Step 1 — Create API Service Layer

Buat:

```
src/
  lib/
    api/
      client.ts
      endpoints.ts
      dashboard.ts
      history.ts
      reports.ts
      notifications.ts
```

Gunakan native `fetch`.

Contoh:

```
export async function getEndpoints() {
  const response = await fetch("/api/endpoints", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch endpoints");
  }

  return response.json();
}
```

Pastikan handling response menggunakan typed API contracts.

Step 2 — Replace Mock Services

Ganti seluruh pemanggilan mock service dengan real API service.

Hapus mock fallback dari production execution path.

Step 3 — Integrate Authentication

- Login.
- Register.
- Logout.
- Protected routes.
- Session handling.

Step 4 — Integrate Dashboard

Dashboard mengambil:

- Total endpoint.
- UP/DOWN count.
- Recent incidents.
- Response time.

Step 5 — Integrate Endpoint Management

Implementasikan:

- Create.
- Update.
- Delete.
- Pause.
- Resume.

Step 6 — Integrate Monitoring History

Implementasikan:

- Pagination.
- Filtering.
- Sorting.
- Date range.

Step 7 — Integrate Manual Check

Saat pengguna menekan Check Now:

1. Frontend mengirim trigger request.
2. Backend melakukan authorization.
3. Backend memasukkan job ke queue.
4. Frontend menampilkan pending state.
5. Frontend melakukan polling secara terbatas.
6. Hasil ditampilkan setelah job selesai.

Untuk MVP, gunakan polling dengan interval terbatas, bukan WebSocket.

Step 8 — Integrate Error Mapping

Petakan error API ke pesan UI yang mudah dipahami.

Step 9 — Implement Refresh Strategy

Gunakan revalidation atau polling untuk data monitoring sesuai kebutuhan.

Jangan melakukan polling terlalu agresif.

Step 10 — Verify End-to-End Flow

Uji registrasi hingga monitoring result tampil pada dashboard.

### 4. Required Commands

Jalankan seluruh service:

```
docker compose up -d postgres redis
```

Terminal pertama:

```
pnpm dev
```

Terminal kedua:

```
pnpm --filter worker dev
```

Jalankan:

```
pnpm lint
pnpm build
```

Nama script disesuaikan dengan konfigurasi workspace.

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Fullstack Integration Engineer.

Project: APIWatch.

Task: PHASE 7 — Frontend & Backend Integration.

Baca:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md

Periksa seluruh implementasi Phase 1–6.

TUJUAN:

Menghubungkan frontend APIWatch dengan backend API dan menghilangkan ketergantungan pada mock data.

SCOPE:

1. Implementasikan API client.
2. Implementasikan endpoint API services.
3. Integrasikan authentication.
4. Integrasikan dashboard.
5. Integrasikan endpoint listing.
6. Integrasikan create endpoint.
7. Integrasikan update endpoint.
8. Integrasikan delete endpoint.
9. Integrasikan pause/resume.
10. Integrasikan endpoint detail.
11. Integrasikan monitoring history.
12. Integrasikan reports.
13. Integrasikan notification settings.
14. Integrasikan manual monitoring.
15. Implementasikan loading states.
16. Implementasikan error mapping.
17. Implementasikan success feedback.
18. Implementasikan refresh dan polling strategy.

RULES:

- Gunakan native fetch jika cukup.
- Gunakan TypeScript API contracts.
- Jangan menduplikasi business logic backend.
- Jangan melakukan monitoring request langsung dari browser.
- Jangan menyimpan secret pada client.
- Jangan menggunakan mock fallback ketika API gagal.
- Hapus atau isolasi mock fixtures yang tidak lagi digunakan.
- Pastikan seluruh request menggunakan session dan authorization yang benar.

END-TO-END FLOW:

Register → Login → Dashboard → Create Endpoint → Save → Scheduler → Worker → Monitoring Result → History → Alert.

BATASAN:

- Jangan membuat fitur P2.
- Jangan membuat billing.
- Jangan membuat multi-region.
- Jangan melakukan perubahan arsitektur besar tanpa alasan.
- Jangan melanjutkan Phase 8.

ACCEPTANCE:

Seluruh core user flows bekerja menggunakan backend aktual.

REPORT:

Laporkan file yang diubah, mock yang dihapus, API yang terintegrasi, user flow yang diuji, hasil testing aktual, dan masalah yang tersisa.

### 6. Expected Deliverables

- API service layer.
- Real data fetching.
- Authentication integration.
- Dashboard integration.
- Endpoint CRUD integration.
- Monitoring history integration.
- Manual check integration.
- Error handling.
- Polling strategy.
- Removal of production mock fallback.

### 7. Acceptance Criteria

- Register bekerja.
- Login bekerja.
- Logout bekerja.
- Dashboard menampilkan data database.
- Create endpoint bekerja.
- Update endpoint bekerja.
- Delete endpoint bekerja.
- Pause/resume bekerja.
- Monitoring result tampil.
- History tampil.
- Manual check bekerja.
- Email notification dapat dikirim.
- Loading states benar.
- Error states benar.
- Tidak ada mock fallback production.
- Cross-user access ditolak.

### 8. Testing Requirements

Integration test:

```
pnpm lint
pnpm build
pnpm test
```

Manual E2E:

1. Register.
2. Login.
3. Create endpoint.
4. Tunggu monitoring.
5. Lihat hasil.
6. Edit endpoint.
7. Pause endpoint.
8. Resume endpoint.
9. Delete endpoint.
10. Periksa notification.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 7: frontend backend integration"
```

## PHASE 8 — Additional Features & Product Completion

Product Completion

&#x20;Estimated: 2–3 days

### 1. Phase Objective

Menyelesaikan fitur pendukung P1 dan meningkatkan pengalaman pengguna agar APIWatch siap memasuki tahap testing menyeluruh.

### 2. Scope of Work

Prioritaskan fitur berikut:

1. Endpoint documentation.
2. Monitoring reports.
3. Improved monitoring history.
4. CSV export.
5. Response preview.
6. Better dashboard visualization.
7. Notification configuration.
8. Public status page sederhana jika masih sesuai kapasitas.
9. SEO landing page.
10. Accessibility improvements.

Tidak semua fitur P1 harus dipaksakan apabila waktu pengembangan terbatas. Prioritaskan dokumentasi endpoint, laporan, dan peningkatan monitoring history.

### 3. Detailed Implementation Steps

Step 1 — Endpoint Documentation

Implementasikan:

- Description.
- Authentication information.
- Request headers.
- Request body example.
- Expected response.
- Notes.

Step 2 — Monitoring Reports

Implementasikan:

- Uptime percentage.
- Average response time.
- Total checks.
- Failed checks.
- Period filtering.

Step 3 — History Improvements

Tambahkan:

- Filter status.
- Filter date.
- Pagination.
- Sorting.
- Error details.

Step 4 — CSV Export

Export hasil monitoring sesuai filter.

Pastikan:

- Ownership diverifikasi.
- Data export dibatasi.
- CSV formula injection dimitigasi dengan sanitasi cell yang diawali karakter berbahaya seperti `=`, `+`, `-`, atau `@`.

Step 5 — Response Preview

Tampilkan response preview yang sudah disanitasi.

Jangan merender HTML dari response target sebagai HTML aktif.

Step 6 — Notification Improvements

Tambahkan:

- Enable/disable notifications.
- Email preference.
- Incident alert.
- Recovery alert.

Step 7 — SEO

Optimalkan halaman publik:

- Title.
- Meta description.
- Open Graph.
- Sitemap.
- Robots.
- Canonical URL.

Dashboard harus tidak terindeks mesin pencari.

Step 8 — Accessibility

Periksa:

- Keyboard navigation.
- Focus.
- Labels.
- Contrast.
- Dialog accessibility.
- Screen reader semantics.

Step 9 — Product Polish

Perbaiki:

- Empty states.
- Error messages.
- Loading states.
- Toast feedback.
- Responsive layouts.

### 4. Required Commands

```
pnpm lint
pnpm build
pnpm test
```

Jika menggunakan Playwright:

```
pnpm exec playwright test
```

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior Fullstack Product Engineer.

Project: APIWatch.

Task: PHASE 8 — Additional Features & Product Completion.

Baca:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md

TUJUAN:

Menyelesaikan fitur P1 yang relevan dan meningkatkan kualitas pengalaman pengguna.

PRIORITAS IMPLEMENTASI:

1. Endpoint documentation.
2. Detailed monitoring reports.
3. Monitoring history improvements.
4. CSV export.
5. Safe response preview.
6. Notification configuration.
7. Dashboard improvements.
8. Public landing page SEO.
9. Accessibility improvements.
10. Responsive improvements.

IMPLEMENTATION RULES:

- Gunakan backend dan database aktual.
- Jangan menggunakan mock data.
- Semua endpoint API harus memvalidasi ownership.
- CSV export harus aman terhadap formula injection.
- Response preview harus disanitasi.
- Jangan merender response HTML pengguna secara langsung.
- Dashboard tidak boleh terindeks mesin pencari.
- Pertahankan existing architecture.

BATASAN:

- Jangan mengimplementasikan billing.
- Jangan mengimplementasikan team management.
- Jangan mengimplementasikan multi-region.
- Jangan mengimplementasikan AI features.
- Jangan mengimplementasikan fitur P2.
- Jangan melakukan refactoring besar tanpa kebutuhan.
- Jangan menambahkan dependency yang tidak diperlukan.
- Jangan melanjutkan Phase 9.

ACCEPTANCE:

Fitur P1 terpilih berjalan dan tidak merusak seluruh P0 functionality.

REPORT:

Laporkan fitur yang selesai, file yang berubah, dependency, hasil testing, dan fitur P1 yang sengaja ditunda.

### 6. Expected Deliverables

- Endpoint documentation.
- Reports improvements.
- History filtering.
- CSV export.
- Response preview.
- Notification preferences.
- SEO metadata.
- Accessibility improvements.
- Product polish.

### 7. Acceptance Criteria

- Endpoint documentation berfungsi.
- Reports menampilkan data aktual.
- History dapat difilter.
- Pagination berfungsi.
- CSV export aman.
- Response preview aman.
- Notification preferences tersimpan.
- Landing page memiliki metadata.
- Dashboard tidak terindeks.
- Responsive layout baik.
- Tidak ada regresi pada P0.

### 8. Testing Requirements

```
pnpm lint
pnpm build
pnpm test
```

Manual:

- CSV export.
- Report calculation.
- History filter.
- Response preview.
- Accessibility.
- SEO metadata.
- Mobile layout.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 8: additional features"
```

## PHASE 9 — Testing, Security & Optimization

Quality Assurance

&#x20;Estimated: 2–4 days

### 1. Phase Objective

Melakukan pengujian menyeluruh terhadap APIWatch, memperbaiki bug, mengaudit keamanan, dan memastikan aplikasi siap production.

Output: `TEST_REPORT.md`.

Phase ini hanya memperbaiki kualitas dan bug, bukan menambah fitur.

### 2. Scope of Work

- Unit testing.
- Integration testing.
- E2E testing.
- API testing.
- Worker testing.
- Scheduler testing.
- Database testing.
- Security testing.
- SSRF testing.
- Authorization testing.
- Performance testing.
- Responsive testing.
- Browser testing.
- Build verification.
- Dependency audit.

### 3. Detailed Implementation Steps

Step 1 — Type Checking

```
pnpm exec tsc --noEmit
```

Untuk monorepo, jalankan type checking pada seluruh workspace menggunakan script yang sudah disediakan.

Step 2 — Linting

```
pnpm lint
```

Step 3 — Unit Tests

Fokus:

- HTTP validation.
- URL security.
- Response assertions.
- Status transitions.
- Uptime calculations.
- Encryption.
- Error normalization.

Step 4 — Integration Tests

Uji:

- PostgreSQL.
- Prisma.
- Redis.
- BullMQ.
- API routes.
- Authentication.
- Worker processing.
- Notification processing.

Step 5 — E2E Tests

Uji:

- Registration.
- Login.
- Dashboard.
- Create endpoint.
- Edit endpoint.
- Delete endpoint.
- Pause/resume.
- History.
- Reports.

Step 6 — Monitoring Tests

Gunakan local mock HTTP server.

Buat endpoint pengujian:

```
GET /success
GET /failure
GET /slow
GET /invalid-body
GET /invalid-header
GET /large-response
```

Jangan menggunakan endpoint pihak ketiga untuk pengujian otomatis yang berulang.

Step 7 — Security Audit

Prioritaskan:

- SSRF.
- DNS rebinding.
- Redirect bypass.
- IPv6.
- Cloud metadata access.
- Authorization bypass.
- IDOR.
- Credential leakage.
- Rate limiting.
- Session security.
- CSV injection.
- XSS.

Step 8 — Performance Testing

Periksa:

- Dashboard query.
- History query.
- Worker concurrency.
- Queue backlog.
- Redis utilization.
- PostgreSQL connection count.
- Response size handling.

Step 9 — Dependency Audit

```
pnpm audit
```

Tinjau temuan dan lakukan update dependency yang kompatibel. Jangan mengabaikan vulnerability critical/high tanpa analisis.

Step 10 — Production Build

```
pnpm build
```

Step 11 — Generate TEST_REPORT.md

Dokumentasikan:

- Test scope.
- Test results.
- Passed.
- Failed.
- Security findings.
- Performance findings.
- Known issues.
- Production readiness.

### 4. Required Commands

```
pnpm install --frozen-lockfile

pnpm lint

pnpm exec tsc --noEmit

pnpm test

pnpm build

pnpm audit
```

Playwright:

```
pnpm exec playwright test
```

Jika belum ada test script, tambahkan konfigurasi test yang sesuai dengan stack dan arsitektur pada fase ini tanpa memperluas scope produk.

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior QA Engineer, Security Engineer, dan Performance Engineer.

Project: APIWatch.

Task: PHASE 9 — Testing, Security & Optimization.

Baca seluruh dokumentasi:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md

Periksa seluruh implementasi Phase 1–8.

TUJUAN:

Memastikan APIWatch stabil, aman, dan siap production.

SCOPE:

1. Type checking.
2. Linting.
3. Unit testing.
4. Integration testing.
5. E2E testing.
6. API testing.
7. Worker testing.
8. Scheduler testing.
9. Database testing.
10. Authentication testing.
11. Authorization testing.
12. SSRF testing.
13. DNS rebinding testing.
14. Redirect security testing.
15. Credential leakage testing.
16. Rate limiting testing.
17. Performance testing.
18. Responsive testing.
19. Browser compatibility.
20. Dependency audit.
21. Production build verification.
22. Bug fixing.

CRITICAL SECURITY CHECKS:

- Private IP blocking.
- Loopback blocking.
- IPv6 private address blocking.
- Metadata endpoint blocking.
- DNS rebinding resistance.
- Redirect validation.
- Workspace isolation.
- Secret encryption.
- Log redaction.
- Session security.
- CSV formula injection.
- XSS.

TESTING RULES:

- Jangan mengarang test results.
- Jalankan seluruh command yang dilaporkan.
- Catat test yang tidak dapat dijalankan.
- Gunakan local mock HTTP server untuk monitoring tests.
- Jangan menggunakan target API pihak ketiga tanpa izin.
- Jangan menambahkan fitur baru.
- Jangan melakukan refactoring besar tanpa alasan.
- Jangan mengubah scope produk.

OUTPUT:

Buat TEST_REPORT.md yang berisi:

- Testing environment.
- Test commands.
- Unit test results.
- Integration test results.
- E2E results.
- Security audit.
- Performance findings.
- Dependency audit.
- Known issues.
- Fixed issues.
- Unresolved issues.
- Production readiness assessment.

ACCEPTANCE:

Semua critical issues harus diselesaikan atau didokumentasikan sebagai blocker. Jangan menyatakan production-ready jika terdapat critical security issue.

Jangan lanjut Phase 10.

### 6. Expected Deliverables

- Unit tests.
- Integration tests.
- E2E tests.
- Security test results.
- Performance test results.
- Dependency audit results.
- Bug fixes.
- `TEST_REPORT.md`.

### 7. Acceptance Criteria

- TypeScript check berhasil.
- Lint berhasil.
- Unit tests berhasil.
- Integration tests berhasil.
- E2E tests berhasil.
- Worker tests berhasil.
- Scheduler tests berhasil.
- Security checks selesai.
- SSRF tests berhasil.
- Authorization tests berhasil.
- No unresolved critical vulnerability.
- Production build berhasil.
- Test report tersedia.

### 8. Testing Requirements

Seluruh command wajib dicatat hasil aktualnya.

Production build:

```
pnpm build
```

Jika ada test yang gagal:

1. Identifikasi penyebab.
2. Perbaiki.
3. Jalankan ulang.
4. Catat hasil terbaru.

### 9. Git Checkpoint

```
git add .
git commit -m "phase 9: testing and optimization"
```

## PHASE 10 — Production Deployment & Release

Production Release

&#x20;Estimated: 1–2 days

### 1. Phase Objective

Melakukan deployment APIWatch ke production menggunakan arsitektur web application yang telah ditentukan.

Hasil utama:

- `DEPLOYMENT_GUIDE.md`.
- `RELEASE_NOTES.md`.

### 2. Scope of Work

- Production configuration.
- Environment variables.
- Docker.
- Docker Compose.
- PostgreSQL deployment.
- Redis deployment.
- Next.js deployment.
- Worker deployment.
- Reverse proxy.
- Domain.
- DNS.
- HTTPS.
- Database migration.
- Backup.
- Monitoring.
- Logging.
- Smoke testing.
- Release documentation.

### 3. Detailed Implementation Steps

Step 1 — Prepare Production Infrastructure

Rekomendasi awal:

- Ubuntu LTS VPS.
- Docker Engine.
- Docker Compose.
- Domain.
- Caddy atau Nginx.
- PostgreSQL.
- Redis.

Single VPS cukup untuk MVP, dengan catatan kapasitas dan availability harus dievaluasi.

Step 2 — Configure Docker

Buat Dockerfile untuk:

- Next.js web.
- Node.js worker.

Gunakan multi-stage builds.

Ketentuan:

- Non-root user.
- Minimal production dependencies.
- Health checks.
- Graceful shutdown.
- Persistent database volume.
- Persistent Redis volume.

Step 3 — Configure Docker Compose

Service:

```
web
worker
postgres
redis
proxy
```

Redis dan PostgreSQL tidak boleh dipublikasikan ke internet.

Step 4 — Configure Environment Variables

Production environment:

```
NODE_ENV=production

DATABASE_URL=
REDIS_URL=

AUTH_SECRET=
AUTH_URL=

ENCRYPTION_KEY=

APP_URL=

EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

Gunakan secret yang berbeda dari development.

Step 5 — Configure Domain and DNS

Contoh:

```
apiwatch.example.com
```

DNS:

- A record.
- Optional AAAA record jika IPv6 sudah benar-benar didukung.

Step 6 — Configure HTTPS

Gunakan:

- Caddy automatic HTTPS, atau
- Nginx + Certbot.

Pastikan redirect HTTP ke HTTPS.

Step 7 — Database Migration

Jalankan migration production menggunakan:

```
pnpm prisma migrate deploy
```

Jangan menggunakan `prisma migrate dev` pada production.

Step 8 — Start Services

```
docker compose up -d --build
```

Step 9 — Verify Containers

```
docker compose ps
docker compose logs -f web
docker compose logs -f worker
```

Step 10 — Configure Backup

Minimal:

- Daily PostgreSQL backup.
- Retention policy.
- Backup disimpan di lokasi terpisah dari VPS.
- Restore procedure diuji.

Step 11 — Production Monitoring

Pantau:

- Web health.
- Worker health.
- Queue backlog.
- Redis health.
- PostgreSQL health.
- Disk usage.
- Memory usage.
- CPU.
- Failed monitoring jobs.

Step 12 — Production Smoke Test

Uji:

1. Landing page.
2. Register.
3. Login.
4. Create endpoint.
5. Monitoring execution.
6. Monitoring history.
7. Email alert.
8. Pause/resume.
9. Logout.

Step 13 — Release Documentation

Buat:

- Deployment guide.
- Release notes.
- Environment variable reference.
- Backup procedure.
- Rollback procedure.

### 4. Required Commands

Server:

```
docker --version
docker compose version
```

Build:

```
docker compose build
```

Migration:

```
docker compose run --rm web pnpm prisma migrate deploy
```

Start:

```
docker compose up -d
```

Check:

```
docker compose ps
docker compose logs --tail=100
```

Check web endpoint:

```
curl -I https://apiwatch.example.com
```

Backup contoh:

```
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > apiwatch-backup.sql
```

Pastikan credential backup tidak terekspos dalam shell history atau process listing. Untuk backup production, gunakan script khusus yang membaca credential secara aman.

### 5. AI Coding Assistant Prompt

Kamu bertindak sebagai Senior DevOps Engineer dan Release Engineer.

Project: APIWatch.

Task: PHASE 10 — Production Deployment & Release.

Baca:

- PROJECT_PRD_AND_PLAYBOOK.md
- TECHNICAL_PLAN.md
- UI_UX_GUIDE.md
- TEST_REPORT.md

TUJUAN:

Menyiapkan APIWatch untuk production deployment sesuai arsitektur web application.

SCOPE:

1. Production environment configuration.
2. Dockerfile untuk Next.js.
3. Dockerfile untuk worker.
4. Docker Compose.
5. PostgreSQL service.
6. Redis service.
7. Reverse proxy.
8. Domain configuration guide.
9. DNS configuration.
10. HTTPS configuration.
11. Production database migration.
12. Persistent storage.
13. Health checks.
14. Graceful shutdown.
15. Logging.
16. Backup.
17. Restore procedure.
18. Worker monitoring.
19. Queue monitoring.
20. Production smoke test.
21. Deployment documentation.
22. Release notes.

SECURITY:

- Jangan mengekspos PostgreSQL ke public internet.
- Jangan mengekspos Redis ke public internet.
- Gunakan production secrets.
- Jangan memasukkan .env ke Docker image.
- Gunakan non-root container user.
- Batasi network access.
- Pastikan monitoring worker memiliki egress security.
- Jangan menyimpan credential dalam Git.

DEPLOYMENT:

Gunakan Docker Compose pada VPS sesuai TECHNICAL_PLAN.md.

Jangan menggunakan desktop application architecture.

Jangan menganggap serverless cocok untuk continuous monitoring worker.

DATABASE:

Gunakan prisma migrate deploy untuk production.

BACKUP:

Sediakan backup dan restore documentation.

OUTPUT:

1. DEPLOYMENT_GUIDE.md.
2. RELEASE_NOTES.md.
3. Dockerfiles.
4. docker-compose.yml.
5. Reverse proxy configuration.
6. Production environment reference.
7. Backup and restore scripts jika diperlukan.
8. Smoke test checklist.

BATASAN:

- Jangan menambahkan fitur produk.
- Jangan mengubah arsitektur tanpa alasan.
- Jangan melakukan deployment yang menghapus data.
- Jangan menjalankan destructive migration tanpa backup.
- Jangan mengklaim deployment berhasil jika belum benar-benar dilakukan.
- Jangan menampilkan production secrets.

ACCEPTANCE:

Deployment dapat dijalankan ulang, services sehat, monitoring worker berjalan, HTTPS aktif, backup terdokumentasi, dan smoke test berhasil.

REPORT:

Laporkan seluruh file, konfigurasi, command, hasil deployment aktual, hasil smoke test, dan known operational risks.

### 6. Expected Deliverables

- `Dockerfile` untuk web.
- `Dockerfile` untuk worker.
- `docker-compose.yml`.
- Reverse proxy configuration.
- Production environment documentation.
- `DEPLOYMENT_GUIDE.md`.
- `RELEASE_NOTES.md`.
- Backup procedure.
- Restore procedure.
- Production smoke test report.

### 7. Acceptance Criteria

- Production configuration tersedia.
- Docker image berhasil dibangun.
- Web container berjalan.
- Worker container berjalan.
- PostgreSQL berjalan.
- Redis berjalan.
- Database migration berhasil.
- Reverse proxy berjalan.
- HTTPS aktif.
- Redis tidak public.
- PostgreSQL tidak public.
- Monitoring worker aktif.
- Scheduler bekerja.
- Backup tersedia.
- Restore procedure terdokumentasi.
- Smoke test berhasil.
- Deployment guide tersedia.
- Release notes tersedia.

### 8. Testing Requirements

```
docker compose config

docker compose build

docker compose up -d

docker compose ps

docker compose logs --tail=100

curl -I https://apiwatch.example.com
```

Pastikan smoke test benar-benar menggunakan production environment.

### 9. Git Checkpoint

Setelah seluruh deployment dan release artifacts direview:

```
git add .
git commit -m "phase 10: production deployment"
```

# PART C — GLOBAL AI CODING RULES

Bagian ini merupakan instruksi global yang berlaku untuk seluruh phase.

## C.1 Project Context

```
Project:
APIWatch – API Monitoring

Primary Document:
PROJECT_PRD_AND_PLAYBOOK.md

Technical Reference:
TECHNICAL_PLAN.md

Design Reference:
UI_UX_GUIDE.md

Development Approach:
Solo Developer + AI Coding Assistant

Architecture:
Next.js + PostgreSQL + Redis/BullMQ + Node.js Worker

Platform:
Web Application
```

## C.2 Mandatory Rules

1. Baca PRD sebelum memulai pekerjaan.
2. Baca technical plan apabila tersedia.
3. Baca UI/UX guide apabila pekerjaan menyangkut frontend.
4. Kerjakan hanya phase yang diminta.
5. Periksa kondisi repository sebelum mengubah file.
6. Jangan menimpa pekerjaan yang sudah ada tanpa alasan.
7. Jangan mengubah tech stack tanpa persetujuan.
8. Jangan menambahkan dependency tanpa kebutuhan.
9. Jangan membuat fitur di luar scope.
10. Jangan menggunakan mock data sebagai pengganti production backend.
11. Jangan mengarang hasil testing.
12. Jalankan testing yang relevan.
13. Jangan melanjutkan phase berikutnya secara otomatis.
14. Laporkan seluruh file yang dibuat dan diubah.
15. Laporkan dependency yang ditambahkan.
16. Laporkan hasil testing aktual.
17. Dokumentasikan keputusan teknis penting.
18. Pertahankan TypeScript type safety.
19. Hindari `any` kecuali benar-benar diperlukan dan diberi alasan.
20. Jangan menyimpan secret dalam source code.

## C.3 Architecture Rules

- Next.js untuk web application dan API.
- Node.js Worker untuk monitoring.
- PostgreSQL untuk persistent storage.
- Redis + BullMQ untuk background jobs.
- Gunakan shared modules jika memang diperlukan.
- Hindari microservices.
- Jangan melakukan monitoring HTTP request dari browser.
- Jangan menjalankan continuous scheduler di serverless function.
- Jangan menggunakan Axios apabila native fetch cukup.
- Jangan menggunakan Zustand untuk seluruh state.
- Jangan membuat repository abstraction berlebihan.

## C.4 Security Rules

- Server-side validation wajib.
- Ownership verification wajib.
- SSRF protection wajib.
- Credential encryption wajib.
- Rate limiting wajib.
- Log redaction wajib.
- Private network access harus diblokir.
- Redirect harus divalidasi ulang.
- Response body harus dibatasi.
- Database dan Redis tidak boleh public.

## C.5 Code Quality Rules

Gunakan:

- Small functions.
- Clear naming.
- Reusable components.
- Explicit interfaces.
- Consistent error handling.
- Typed API contracts.
- Modular business logic.
- Testable services.

Hindari:

- Giant components.
- Giant services.
- Duplicate business logic.
- Circular dependencies.
- Unnecessary abstractions.
- Unnecessary dependencies.
- Hardcoded secrets.
- Uncontrolled background jobs.

## C.6 Phase Completion Report

Setiap AI Coding Assistant harus menghasilkan laporan berikut:

```
PHASE COMPLETION REPORT

Project:
APIWatch

Phase:
[PHASE NUMBER AND NAME]

1. SUMMARY
- What was implemented?

2. FILES CREATED
- List all new files.

3. FILES MODIFIED
- List all modified files.

4. DEPENDENCIES
- New dependencies.
- Reason for each dependency.

5. IMPLEMENTATION DETAILS
- Important technical decisions.
- Architecture changes if any.

6. TESTING
- Commands executed.
- Actual results.
- Failed tests.

7. ACCEPTANCE CRITERIA
- Passed criteria.
- Failed criteria.

8. KNOWN ISSUES
- Remaining problems.
- Technical debt.

9. SECURITY CONSIDERATIONS
- Security checks performed.
- Remaining security risks.

10. GIT STATUS
- Modified files.
- Ready for checkpoint: Yes/No.

11. PHASE STATUS
- COMPLETED
- PARTIALLY COMPLETED
- BLOCKED

12. NEXT STEP
- Wait for explicit approval.
- Do not start the next phase automatically.
```

# PART D — GIT & EXECUTION RULES

## D.1 Git Strategy

Gunakan satu branch utama:

```
main
```

Pengembangan dilakukan dengan phase checkpoint.

Untuk solo developer, tidak perlu branch kompleks.

Jika ingin memisahkan eksperimen:

```
main
feature/phase-1-bootstrap
feature/phase-2-architecture
```

Setelah perubahan disetujui, merge kembali ke main.

## D.2 Git Checkpoint Commands

Sebelum commit:

```
git status
git diff
git diff --check
```

Jalankan testing yang diwajibkan pada phase tersebut.

Lalu:

```
git add .
git commit -m "phase 1: project bootstrap"
```

## D.3 Commit Convention

| Phase | Commit Message                          |
| ----- | --------------------------------------- |
| 1     | `phase 1: project bootstrap`            |
| 2     | `phase 2: technical architecture`       |
| 3     | `phase 3: ui ux planning`               |
| 4     | `phase 4: frontend foundation`          |
| 5     | `phase 5: core frontend features`       |
| 6     | `phase 6: backend implementation`       |
| 7     | `phase 7: frontend backend integration` |
| 8     | `phase 8: additional features`          |
| 9     | `phase 9: testing and optimization`     |
| 10    | `phase 10: production deployment`       |

## D.4 Mandatory Checkpoint Rules

Setiap phase harus:

1. Diselesaikan.
2. Dijalankan secara lokal.
3. Diuji.
4. Direview.
5. Memenuhi acceptance criteria.
6. Dilaporkan oleh AI.
7. Disetujui developer.
8. Di-commit.

Jika acceptance criteria belum terpenuhi, jangan commit sebagai checkpoint selesai.

## D.5 Recovery Strategy

Jika phase mengalami masalah:

```
git status
git log --oneline -10
git diff
```

Jika perlu kembali ke checkpoint:

```
git restore .
```

Untuk perubahan yang sudah masuk commit, gunakan:

```
git revert <commit-hash>
```

Jangan menggunakan `git reset --hard` tanpa memahami dampaknya karena dapat menghapus pekerjaan yang belum tersimpan.

# PART E — COMMAND CHEAT SHEET

Kumpulan command yang digunakan selama pengembangan APIWatch.

## E.1 Development Environment

```
node --version
pnpm --version
git --version

pnpm install
pnpm dev
```

## E.2 Frontend

```
pnpm dev
pnpm build
pnpm lint
```

## E.3 Database / Prisma

```
pnpm prisma init

pnpm prisma validate

pnpm prisma generate

pnpm prisma migrate dev --name init

pnpm prisma migrate deploy

pnpm prisma studio
```

## E.4 Redis & BullMQ

Jika menggunakan Docker Compose:

```
docker compose up -d redis
```

Periksa container:

```
docker compose ps
```

Periksa Redis:

```
docker compose exec redis redis-cli ping
```

Expected output:

```
PONG
```

## E.5 Worker

Contoh jika worker sudah dikonfigurasi dalam pnpm workspace:

```
pnpm --filter worker dev
```

Build worker:

```
pnpm --filter worker build
```

Production worker:

```
pnpm --filter worker start
```

## E.6 Testing

```
pnpm lint

pnpm exec tsc --noEmit

pnpm test

pnpm build

pnpm audit
```

E2E:

```
pnpm exec playwright test
```

## E.7 Git

```
git status

git diff

git add .

git commit -m "phase 1: project bootstrap"

git log --oneline
```

## E.8 Docker

```
docker compose config

docker compose build

docker compose up -d

docker compose ps

docker compose logs -f

docker compose down
```

Jangan menggunakan `docker compose down -v` pada production karena dapat menghapus persistent volumes.

## E.9 Production Database

```
pnpm prisma migrate deploy
```

Database backup:

```
pg_dump -U postgres -d apiwatch > backup.sql
```

Database restore:

```
psql -U postgres -d apiwatch < backup.sql
```

Gunakan backup yang terverifikasi dan lakukan restore test secara berkala.

# PART F — FINAL CHECKLIST & DOCUMENTATION

## F.1 Development Phase Checklist

Gunakan checklist berikut untuk mengontrol perkembangan project.

Development progress

# 0%

0 dari 42 acceptance checklist items

Phase 1 — Environment & Project Bootstrap

0/4

Next.js berhasil dijalankan

TypeScript, Tailwind, dan shadcn/ui tersedia

Git dan environment variables dikonfigurasi

Lint dan build berhasil

Phase 2 — Technical Planning & Architecture

0/4

TECHNICAL_PLAN.md tersedia

Architecture dan folder structure ditentukan

Database dan queue architecture ditentukan

Security dan deployment architecture ditentukan

Phase 3 — UI/UX Planning & Design System

0/4

UI_UX_GUIDE.md tersedia

Design tokens ditentukan

Semua halaman P0 memiliki spesifikasi

Responsive dan accessibility ditentukan

Phase 4 — Frontend Foundation

0/4

Application shell selesai

Navigation berfungsi

Reusable components tersedia

Responsive layout berfungsi

Phase 5 — Core Frontend Features

0/4

Dashboard dan endpoint UI selesai

Form validation berfungsi

History dan reports UI tersedia

Mock data terisolasi

Phase 6 — Backend & Core Business Logic

0/5

PostgreSQL dan Prisma berjalan

Authentication dan CRUD API berfungsi

Redis dan BullMQ berjalan

Monitoring worker dan scheduler berfungsi

SSRF protection dan credential encryption diuji

Phase 7 — Frontend & Backend Integration

0/4

Mock diganti real API

Dashboard menggunakan data aktual

Endpoint CRUD bekerja end-to-end

Monitoring history dan manual check bekerja

Phase 8 — Additional Features

0/4

Endpoint documentation tersedia

Reports dan history improvements selesai

CSV export aman

SEO dan accessibility diperbaiki

Phase 9 — Testing & Optimization

0/4

Unit dan integration tests lulus

E2E tests lulus

Security audit selesai

TEST_REPORT.md tersedia

Phase 10 — Production Deployment

0/5

Docker deployment berhasil

Worker dan scheduler berjalan

HTTPS dan domain aktif

Backup dan restore terdokumentasi

DEPLOYMENT_GUIDE.md dan RELEASE_NOTES.md tersedia

Reset checklist

## F.2 Required Documentation Files

Pada akhir pengembangan, repository APIWatch minimal memiliki dokumentasi:

```
apiwatch/
│
├── PROJECT_PRD_AND_PLAYBOOK.md
│
├── README.md
│
├── TECHNICAL_PLAN.md
│
├── UI_UX_GUIDE.md
│
├── TEST_REPORT.md
│
├── DEPLOYMENT_GUIDE.md
│
├── RELEASE_NOTES.md
│
├── docs/
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── MONITORING_ENGINE.md
│   ├── SECURITY.md
│   ├── ENVIRONMENT_VARIABLES.md
│   └── BACKUP_AND_RESTORE.md
│
├── apps/
│   ├── web/
│   └── worker/
│
└── packages/
    ├── shared/
    ├── database/
    └── monitoring/
```

Beberapa dokumentasi dapat dibuat secara bertahap sesuai kebutuhan. Tidak perlu membuat seluruh file kosong pada Phase 1.

## F.3 Final Product Checklist

### Product

- Landing page tersedia.
- Authentication tersedia.
- Dashboard tersedia.
- Endpoint management tersedia.
- Monitoring otomatis berjalan.
- HTTP status validation berjalan.
- Response time tercatat.
- Header validation berjalan.
- Body validation berjalan.
- Monitoring history tersedia.
- Email alert berjalan.
- Endpoint documentation tersedia.
- Reports tersedia.

### Backend

- Next.js API berjalan.
- PostgreSQL berjalan.
- Redis berjalan.
- BullMQ berjalan.
- Worker berjalan.
- Scheduler berjalan.
- Scheduler reconciliation berjalan.
- Error handling berjalan.
- Logging tersedia.

### Security

- Authentication aman.
- Authorization aman.
- SSRF protection aktif.
- DNS rebinding ditangani.
- Credential terenkripsi.
- Rate limiting aktif.
- Private network diblokir.
- Redis tidak public.
- PostgreSQL tidak public.
- Secrets tidak masuk Git.

### Production

- Docker berhasil.
- Reverse proxy tersedia.
- HTTPS aktif.
- Domain aktif.
- Database backup tersedia.
- Restore telah diuji.
- Worker health dapat dipantau.
- Queue backlog dapat dipantau.
- Smoke test berhasil.

# F.4 Recommended Development Timeline

Estimasi untuk solo developer yang menggunakan AI Coding Assistant secara efektif:

| Phase    | Estimated Duration |
| -------- | ------------------ |
| Phase 1  | 0.5–1 hari         |
| Phase 2  | 1 hari             |
| Phase 3  | 1 hari             |
| Phase 4  | 1–2 hari           |
| Phase 5  | 2–3 hari           |
| Phase 6  | 4–7 hari           |
| Phase 7  | 2–3 hari           |
| Phase 8  | 2–3 hari           |
| Phase 9  | 2–4 hari           |
| Phase 10 | 1–2 hari           |
| Total    | 15.5–27 hari       |

Estimasi development aktif, tidak termasuk waktu menunggu layanan eksternal, domain, atau infrastructure provisioning. Phase 6 dapat memerlukan waktu lebih panjang apabila SSRF protection dan worker scheduling membutuhkan debugging tambahan.

# F.5 Recommended MVP Release Strategy

Saya merekomendasikan APIWatch dirilis dalam tiga tahap.

Release 1

Core Monitoring MVP

- Authentication.
- Endpoint CRUD.
- HTTP monitoring.
- Status code.
- Response time.
- Header/body validation.
- Monitoring history.
- Email alert.

Release 2

Developer Experience

- Endpoint documentation.
- Monitoring reports.
- CSV export.
- Improved dashboard.
- Better history filtering.

Release 3

Commercialization

- Free plan limits.
- Paid subscriptions.
- Billing integration.
- Workspace collaboration.
- Public status pages.

Release 1 merupakan target utama. Jangan menunda peluncuran MVP hanya karena fitur komersialisasi belum tersedia.

# F.6 Monetization Strategy

APIWatch dapat menggunakan model freemium berdasarkan jumlah endpoint dan frekuensi pemeriksaan.

Contoh rancangan paket awal:

| Feature             | Free    | Pro      | Team     |
| ------------------- | ------- | -------- | -------- |
| Monitored endpoints | 5       | 30       | 100      |
| Minimum interval    | 5 menit | 1 menit  | 1 menit  |
| History retention   | 7 hari  | 30 hari  | 90 hari  |
| Email alert         | Yes     | Yes      | Yes      |
| Reports             | Basic   | Advanced | Advanced |
| CSV export          | No      | Yes      | Yes      |
| Team members        | 1       | 1        | 5        |

Angka merupakan hipotesis produk untuk validasi pasar, bukan harga atau kapasitas infrastruktur yang sudah diuji.

Catatan penting: Free tier perlu memiliki batas yang cukup ketat karena jumlah monitoring checks berbanding langsung dengan konsumsi resource.

Contoh:

Jika pengguna memiliki 5 endpoint dengan interval 5 menit:

\\[ 5 \times 12 \times 24 = 1.440 \\]

Artinya terdapat sekitar 1.440 monitoring checks setiap hari untuk satu pengguna.

Apabila terdapat 100 pengguna dengan konfigurasi tersebut:

\\[ 1.440 \times 100 = 144.000 \\]

Itulah alasan mengapa interval monitoring, jumlah endpoint, concurrency, dan response size harus menjadi bagian dari strategi monetisasi.

# F.7 Final Architecture Recommendation

## APIWatch Production Architecture

Recommended for MVP

Frontend

Next.js + TypeScript + Tailwind + shadcn/ui

Backend API

Next.js Route Handlers + Prisma

Database

PostgreSQL

Queue

Redis + BullMQ

Monitoring Engine

Dedicated Node.js Worker

Notification

SMTP / Email Provider

Deployment

Docker Compose + Ubuntu VPS + Caddy/Nginx + HTTPS.

## Final Technical Decisions

| Decision          | Recommendation                                       |
| ----------------- | ---------------------------------------------------- |
| Frontend          | Next.js App Router                                   |
| Backend           | Next.js Route Handlers                               |
| Monitoring engine | Node.js Worker                                       |
| Database          | PostgreSQL                                           |
| ORM               | Prisma                                               |
| Queue             | BullMQ                                               |
| Queue storage     | Redis                                                |
| Authentication    | Auth.js                                              |
| Validation        | Zod                                                  |
| HTTP requests     | Native fetch with controlled DNS/connection handling |
| Client state      | React state first, Zustand when needed               |
| UI                | Tailwind + shadcn/ui                                 |
| Charts            | Recharts                                             |
| Testing           | Vitest + Playwright                                  |
| Deployment        | Docker Compose on VPS                                |
| Reverse proxy     | Caddy                                                |
| Billing           | Deferred                                             |

# FINAL DEVELOPMENT INSTRUCTION

Urutan pengerjaan yang harus diikuti:

```
PHASE 1
   ↓
PHASE 2
   ↓
PHASE 3
   ↓
PHASE 4
   ↓
PHASE 5
   ↓
PHASE 6
   ↓
PHASE 7
   ↓
PHASE 8
   ↓
PHASE 9
   ↓
PHASE 10
   ↓
APIWATCH MVP RELEASE
```

Aturan paling penting:

1. Simpan dokumen ini sebagai `PROJECT_PRD_AND_PLAYBOOK.md` di root repository.
2. Mulai dari Phase 1 saja.
3. Salin prompt Phase 1 ke AI Coding Assistant di VS Code.
4. Review hasil implementasi AI.
5. Jalankan acceptance tests.
6. Lakukan Git checkpoint.
7. Setelah Phase 1 disetujui, baru jalankan Phase 2.
8. Ulangi proses sampai Phase 10.
9. Jangan meminta AI mengerjakan seluruh phase sekaligus.
10. Jika ada perubahan arsitektur atau scope, perbarui dokumen utama terlebih dahulu.

Catatan khusus: Instruksi tambahan mengenai Internet Speed Test pada template awal tidak diterapkan karena APIWatch adalah API Monitoring. LibreSpeed, bandwidth measurement, upload/download speed testing, dan metodologi ping/jitter tidak termasuk kebutuhan produk ini.

Document Complete

APIWatch — PRD & Sequential Development Playbook selesai.

Dokumen ini sudah memiliki:

- 16 bagian PRD.
- Tepat 10 development phases.
- 10 prompt khusus AI Coding Assistant.
- Acceptance criteria untuk setiap phase.
- Testing requirements.
- Git checkpoints.
- Technical architecture.
- Database design.
- Security dan SSRF requirements.
- Production deployment strategy.
- Monetization strategy.
- Final development checklist.
