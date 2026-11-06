# APIWatch — UI/UX Guide & Design System

> **Document**: `UI_UX_GUIDE.md`  
> **Project**: APIWatch (API Monitoring SaaS)  
> **Phase**: Phase 3 — UI/UX Planning & Design System  
> **Target Audience**: Developers, DevOps Engineers, and Technical Leads  
> **Status**: APPROVED DESIGN SPECIFICATION  

---

## 1. Visual Identity & Brand Personality

APIWatch is built for developers who value speed, clarity, high information density, and uncompromised precision.

- **Developer-Centric**: Monospace numbers for latencies, HTTP status codes, and timestamps.
- **Minimalist & Modern**: High contrast, subtle borders, intentional whitespace, zero decorative clutter.
- **Data-Oriented**: Instant visibility into uptime, latency percentiles, and active incidents.
- **Theme Support**: First-class support for Dark Mode (default for developer appeal) and Light Mode.

---

## 2. Design Tokens & Color System

The design system maps directly to Tailwind CSS variables configured via shadcn/ui.

### 2.1 Base Palette (HSL / CSS Variables)

| Token Name | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--background` | `hsl(0, 0%, 100%)` | `hsl(240, 10%, 4%)` | Page background |
| `--foreground` | `hsl(240, 10%, 4%)` | `hsl(0, 0%, 98%)` | Primary text |
| `--card` | `hsl(0, 0%, 100%)` | `hsl(240, 10%, 6%)` | Card surface |
| `--card-foreground` | `hsl(240, 10%, 4%)` | `hsl(0, 0%, 98%)` | Text on card |
| `--popover` | `hsl(0, 0%, 100%)` | `hsl(240, 10%, 6%)` | Menus & popovers |
| `--popover-foreground`| `hsl(240, 10%, 4%)` | `hsl(0, 0%, 98%)` | Popover text |
| `--primary` | `hsl(221, 83%, 53%)` | `hsl(217, 91%, 60%)` | Primary buttons, brand actions |
| `--primary-foreground` | `hsl(210, 40%, 98%)` | `hsl(222, 47%, 11%)` | Text on primary |
| `--muted` | `hsl(240, 5%, 96%)` | `hsl(240, 4%, 16%)` | Inactive tabs, disabled items |
| `--muted-foreground` | `hsl(240, 4%, 46%)` | `hsl(240, 5%, 65%)` | Subtitles, helper text |
| `--border` | `hsl(240, 6%, 90%)` | `hsl(240, 4%, 16%)` | Card & input borders |

### 2.2 Semantic Monitoring Status Tokens

Endpoint and check statuses have consistent color coding throughout the application:

```
UP       -> Emerald-500 (#10b981) / Emerald-400 (Dark)   | Icon: CheckCircle2
DOWN     -> Rose-600 (#e11d48)    / Rose-500 (Dark)      | Icon: AlertTriangle
PAUSED   -> Amber-500 (#f59e0b)   / Amber-400 (Dark)     | Icon: PauseCircle
PENDING  -> Zinc-400 (#a1a1aa)    / Zinc-500 (Dark)      | Icon: Clock
```

| Status | Background (Subtle) | Text Color | Border Color | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **UP** | `bg-emerald-500/10` | `text-emerald-600 dark:text-emerald-400` | `border-emerald-500/20` | Endpoint passing all assertions |
| **DOWN** | `bg-rose-500/10` | `text-rose-600 dark:text-rose-400` | `border-rose-500/20` | Check failed or timed out |
| **PAUSED**| `bg-amber-500/10` | `text-amber-600 dark:text-amber-400` | `border-amber-500/20` | Monitoring manually suspended |
| **PENDING**| `bg-zinc-500/10` | `text-zinc-600 dark:text-zinc-400` | `border-zinc-500/20` | Newly created, awaiting first job |

### 2.3 HTTP Status Code Color Conventions
- `2xx Success`: Emerald (`bg-emerald-500/15 text-emerald-500`)
- `3xx Redirect`: Blue (`bg-blue-500/15 text-blue-500`)
- `4xx Client Error`: Amber (`bg-amber-500/15 text-amber-500`)
- `5xx Server Error`: Rose (`bg-rose-500/15 text-rose-500`)

---

## 3. Typography & Spacing System

### 3.1 Font Stack
- **Interface & Prose Font**: `Geist Sans`, `Inter`, system-ui
- **Data & Numerical Font**: `Geist Mono`, `ui-monospace`, `SFMono-Regular`, Menlo

### 3.2 Typography Scale
- **H1 (Page Title)**: `text-2xl font-bold tracking-tight` (24px / 32px)
- **H2 (Section Title)**: `text-lg font-semibold tracking-tight` (18px / 28px)
- **H3 (Card Header)**: `text-sm font-medium` (14px / 20px)
- **Body Regular**: `text-sm text-foreground` (14px / 20px)
- **Body Muted**: `text-sm text-muted-foreground` (14px / 20px)
- **Caption / Metadata**: `text-xs text-muted-foreground` (12px / 16px)
- **Metric Value**: `font-mono text-2xl font-bold` (e.g. `99.98%`, `124ms`)

### 3.3 Spacing & Layout Grid
- **Container Max-Width**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section Spacing**: `space-y-6`
- **Card Padding**: `p-6` (desktop), `p-4` (mobile)
- **Grid Layout**: 4 columns on large screens (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`)
- **Border Radius**: `rounded-lg` (8px) for cards, `rounded-md` (6px) for buttons and inputs.

---

## 4. Application Layout & Navigation Structure

### 4.1 Global Layout Wireframe

```
+-------------------------------------------------------------------------+
| [LOGO] APIWatch   [Workspace: Personal v]           [Theme] [User Avatar] |
+--------------------+----------------------------------------------------+
| SIDEBAR            | MAIN CONTENT AREA                                  |
|                    |                                                    |
| > Dashboard        | Breadcrumbs: Home / Endpoints                      |
| > Endpoints        | Header: Endpoints                   [+ New Endpoint]|
| > Incidents (1)    |                                                    |
| > Reports          | [ Filter: All v ] [ Search URL... ]   [ Refresh ]  |
| > Settings         |                                                    |
|                    | +------------------------------------------------+ |
|                    | | Endpoint Table / Cards                         | |
|                    | | Name    | URL         | Status | Latency | Action |
|                    | |---------+-------------+--------+---------+--------|
|                    | | Auth API| /v1/auth    | [UP]   |  84ms   | [...]  |
|                    | | Pay API | /v1/charge  | [DOWN] | 1204ms  | [...]  |
|                    | +------------------------------------------------+ |
+--------------------+----------------------------------------------------+
```

### 4.2 Route Hierarchy

```
/                             -> Marketing Landing Page
/login                        -> Authentication (Email / Password / Magic Link)
/register                     -> User Registration

/dashboard                    -> Main Workspace Overview (Metrics, Incidents, Charts)
/endpoints                    -> Endpoint Management (List, Filter, Pause/Resume)
/endpoints/new                -> Endpoint Creation Form
/endpoints/[id]               -> Endpoint Detailed Health, Latency Charts & Logs
/incidents                    -> Active & Historical Downtime Incidents
/reports                      -> Weekly / Monthly Uptime & Latency Reports
/settings                     -> Workspace, Email Alerts, API Keys
```

---

## 5. Page Specifications (P0 Scope)

### 5.1 Dashboard Overview (`/dashboard`)
1. **Top Stat Cards (4-column grid)**:
   - *Total Endpoints*: Total registered endpoints (e.g., `12`).
   - *Healthy (UP)*: Count and badge in emerald (e.g., `11`).
   - *Down / Degraded*: Count in rose (e.g., `1`), clickable to jump to incident.
   - *Average Response Time*: Weighted average latency in milliseconds (e.g., `142ms`).
2. **Active Incident Banner (conditional)**:
   - Highlighted in rose if any endpoint is currently `DOWN`.
   - Displays failure code (`TIMEOUT`, `HTTP_500`), downtime duration, and quick link.
3. **Global Latency & Health Chart**:
   - 24-hour line/area chart (`Recharts`) showing aggregate response time and check volume.
4. **Endpoint Quick-Status Table**:
   - Top 5 critical endpoints with status indicator, 24-hour uptime sparkline, and quick actions.

---

### 5.2 Endpoint Creation & Edit Form (`/endpoints/new`)
Form is organized into clean collapsible sections to avoid cognitive overload:

1. **Basic Details**:
   - `Endpoint Name` (text, e.g. "Stripe Webhook Gateway")
   - `HTTP Method` (select: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`)
   - `Target URL` (text input with protocol prefix `https://`)
2. **Monitoring Schedule**:
   - `Interval` (dropdown: 1m, 3m, 5m, 10m, 15m, 30m, 60m — default: 5m)
   - `Request Timeout` (number input: default 10,000 ms, max 30,000 ms)
3. **Advanced Request Configuration** *(Accordion, default collapsed)*:
   - `Request Headers` (Key-Value dynamic input rows; supports encrypted authorization tokens)
   - `Request Body` (Monospace text area for JSON payloads; hidden for `GET`/`HEAD`)
   - `Follow Redirects` (toggle switch, default: off)
4. **Assertions & Validation** *(Accordion)*:
   - `Expected Status Codes` (comma-separated or tag input, default: `200`)
   - `Expected Header Matches` (optional key-value checks)
   - `Response Body Contains` (optional string match)
   - `Response Body Not Contains` (optional string mismatch)
5. **Form Actions**:
   - `[Test Endpoint Now]` (runs immediate non-scheduled check and previews result)
   - `[Cancel]` and `[Save & Start Monitoring]` (primary)

---

### 5.3 Endpoint Detail View (`/endpoints/[id]`)

```
+-------------------------------------------------------------------------+
| [<- Back to Endpoints]                                                  |
|                                                                         |
| Stripe Webhook Gateway              [UP] 99.94% Uptime (30d)            |
| POST https://api.stripe.com/v1/events            Interval: 5m | TO: 10s|
| Actions: [ Run Check Now ]   [ Pause Monitoring ]   [ Edit ]   [ Delete]|
+-------------------------------------------------------------------------+
| [ Tabs: Overview | History | Documentation | Settings ]                 |
|                                                                         |
| (Overview Tab)                                                          |
| +-----------------------------------+ +-------------------------------+ |
| | Response Time Chart (Last 24h)    | | Uptime Summary (Last 30 Days) | |
| | Avg: 112ms | p95: 230ms | Max: 410| | Total Checks: 8,640           | |
| | [ Line Chart with Recharts ]      | | Failed Checks: 5              | |
| +-----------------------------------+ +-------------------------------+ |
|                                                                         |
| Recent Check Timeline (Last 50 checks)                                  |
| [||||||||||||||||||||||||||||||||||||||||||||||||||] (hover for details)|
+-------------------------------------------------------------------------+
```

---

### 5.4 Monitoring History Table (`/endpoints/[id]` -> History Tab)
- Paginated table showing latest checks (50 per page).
- **Columns**:
  - `Time`: Relative time with full ISO timestamp tooltip (e.g., "2 minutes ago").
  - `Status`: Badge (`SUCCESS` in green, `FAILED` in red, `TIMEOUT` in orange).
  - `HTTP Status`: e.g. `200 OK` or `502 Bad Gateway`.
  - `Latency`: Monospace duration (e.g. `87 ms`).
  - `Failure Reason`: Descriptive message (e.g. `Status code mismatch: expected 200, got 500`).
  - `Details`: Expandable row displaying assertion test breakdown and response header summary.

---

## 6. Reusable Component Specifications

| Component Name | File Path | Props & Description |
| :--- | :--- | :--- |
| `StatusBadge` | `@/components/endpoints/status-badge.tsx` | `status: EndpointStatus` (`UP`, `DOWN`, `PAUSED`, `PENDING`). Renders colored pill with pulsing dot for active states. |
| `StatCard` | `@/components/dashboard/stat-card.tsx` | `title`, `value`, `description`, `icon`, `trend?`. Renders KPI metric card with dark/light border. |
| `LatencyChart` | `@/components/endpoints/latency-chart.tsx` | `data: { timestamp, latencyMs, isSuccess }[]`. Responsive SVG chart powered by Recharts with custom tooltip. |
| `UptimeBar` | `@/components/endpoints/uptime-bar.tsx` | `checks: CheckSummary[]`. Renders 30-day vertical tick lines representing daily uptime percentage. |
| `EmptyState` | `@/components/ui/empty-state.tsx` | `icon`, `title`, `description`, `actionLabel`, `onAction`. Displayed when no endpoints or logs exist. |
| `ErrorAlert` | `@/components/ui/error-alert.tsx` | `code`, `message`, `onRetry?`. Standard error callout matching Section 11 error formats. |

---

## 7. Responsive Breakpoint Rules

- **Mobile (`< 768px`)**:
  - Sidebar folds into a slide-over sheet triggered by hamburger icon.
  - Stat cards stack in 1 column.
  - Tables convert into card-based summary lists with collapsible detail rows.
  - Form buttons become full-width sticky bottom bars.
- **Tablet (`768px - 1023px`)**:
  - Sidebar remains icon-only or collapsible.
  - Stat cards in 2x2 grid.
  - Latency charts adapt height dynamically (`h-64`).
- **Desktop (`>= 1024px`)**:
  - Full permanent sidebar (240px width).
  - 4-column KPI cards.
  - Full-width dense data tables.

---

## 8. UX States & Edge Cases

### 8.1 Loading States
- Never use full-page blocking spinners.
- Use **Skeleton** screens matching the exact dimension of cards, tables, and metric values.
- Buttons display an inline spinner (`Loader2` from `lucide-react`) and `disabled` state during mutation submissions.

### 8.2 Empty States
- **No Endpoints**: Illustrative radar icon, text "No endpoints monitored yet", and primary CTA button "Create Your First Endpoint".
- **No Incidents**: Green checkmark icon, "All systems operational. No downtime incidents recorded in the last 30 days."
- **No History**: "Waiting for the first scheduled check to execute..."

### 8.3 Error & Feedback Notifications (Toasts)
- Managed via `sonner` (`toast.success(...)`, `toast.error(...)`).
- Actions like *Pause*, *Resume*, *Trigger Check* trigger immediate optimistic toast feedback.

---

## 9. Accessibility (a11y) Guidelines

- **Contrast Ratio**: All text satisfies WCAG 2.1 AA (at least `4.5:1` contrast against background).
- **Keyboard Navigation**: All interactive elements (dropdowns, dialogs, buttons) have visible `:focus-visible` rings (`ring-2 ring-primary ring-offset-2`).
- **Screen Reader Support**:
  - Status indicators include `aria-label` (e.g. `aria-label="Status: Healthy"`).
  - Modals and dialogs trap focus and respond to `Escape`.
  - Icon-only buttons include descriptive `aria-label` or `<span className="sr-only">`.

---

## 10. Phase 3 Deliverable Checklist

- [x] Visual identity defined (developer-focused, dark/light themes).
- [x] Color tokens and semantic status tokens specified.
- [x] Typography and spacing scales established.
- [x] Dashboard layout and navigation documented.
- [x] Wireframes and detailed specifications for all P0 pages defined.
- [x] Reusable component matrix documented.
- [x] Responsive layout rules established.
- [x] Loading, empty, and error state standards defined.
- [x] Accessibility requirements incorporated.
