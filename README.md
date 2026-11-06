# APIWatch – API Monitoring Platform

APIWatch adalah platform monitoring API modern yang memungkinkan developer memantau ketersediaan, latency, dan reliabilitas endpoint HTTP/HTTPS secara berkala dengan notifikasi otomatis.

## 🚀 Tech Stack

- **Frontend & App Backend**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Icons & Charts**: Lucide React & Recharts
- **Validation**: Zod
- **Database (Planned Phase 2+)**: PostgreSQL + Prisma ORM
- **Queue & Scheduler (Planned Phase 2+)**: Redis + BullMQ
- **Dedicated Worker (Planned Phase 2+)**: Node.js + TypeScript
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js >= 20 LTS (Recommended: v22 LTS)
- pnpm >= 9 (Recommended: v10+)
- Git

## 🛠️ Installation & Setup

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd 14-OrderInbox
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment:**
   Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Sesuaikan konfigurasi environment variable yang diperlukan.

## 💻 Development Commands

- `pnpm dev`: Menjalankan server development Next.js (`http://localhost:3000`)
- `pnpm build`: Membangun aplikasi untuk production
- `pnpm start`: Menjalankan aplikasi production build
- `pnpm lint`: Menjalankan ESLint untuk static code analysis

## 📁 Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, route handlers)
│   ├── components/
│   │   └── ui/             # shadcn/ui reusable components
│   └── lib/                # Shared utilities & helpers
├── .env.example            # Environment variables template
├── components.json         # shadcn/ui configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## 📄 License

Private - APIWatch MVP
