# PiagamIPP

**Medication Filling Order (Indent) Waiting Time Tracker** — a hospital pharmacy tool for logging ward medication indents, counterchecking them against a 2-hour service policy, and reporting compliance per category and per ward.

Built for Malaysia (Asia/Kuching, UTC+8) hospital operations, including Sabah public-holiday awareness for automatic indent classification.

## Features

- **Indent intake** — record ward indents (date/time received, type, ward, number of prescriptions) via a validated form; the indent type (Office Hour / IPP Shift / On Call) is auto-detected from the received date, time, and public-holiday status, and can be overridden manually.
- **Counterchecking** — one toggle stamps the completion time and computes the handling duration; unchecking clears it. A live countdown highlights indents nearing the 2-hour limit (orange at 105 min, red at 115 min) with optional sound warnings.
- **Dashboard** — monthly KPIs (total, within/exceeding 2 hours, compliance rate, average/median time, pending) plus a 12-month compliance trend with explicit "no data" gaps for empty months.
- **Reports** — category comparison, compliance rate per ward, and completion-time distribution for any month.
- **Ward management** — CRUD with unique, trimmed names. Renames apply to future indents only (historical indents keep the old name — the UI warns about this).
- **Filtering** — by month, ward, and policy status (achieved / exceeded / pending).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| UI | Mantine 9 (+ charts), Tabler icons |
| Database | MongoDB 7.0+ (Atlas or self-hosted) |
| Holidays | `date-holidays` (MY/Sabah) with optional Calendarific fallback |
| Tests | Vitest 5 |

## Requirements

- **Node.js 22+**
- **MongoDB 7.0 or newer** — the stats endpoints use the `$percentile` aggregation operator

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the environment** — create `.env.local` (git-ignored):

   ```bash
   MONGODB_URI=mongodb+srv://user:pass@cluster/piagamipp   # required
   CALENDARIFIC_API_KEY=...                                 # optional fallback for holiday checks
   ```

3. **Run**

   ```bash
   npm run dev      # development server on http://localhost:3000
   npm run build    # production build
   npm start        # serve the production build
   npm test         # run the Vitest suite
   npm run lint     # ESLint
   ```

Indexes (`indents` date/type/ward/countercheck/total-time, unique `wards.name`) are created automatically on first use, best-effort.

## How timings and policy compliance work

- Indents store their date as **UTC midnight of the Malaysia date**, so server-side month grouping/filters (UTC) and client display (UTC+8) stay consistent.
- **Counterchecking** stamps `dateCompleted`/`timeCompleted` from the server clock (Asia/Kuching) and computes `totalTimeMinutes` from the received and completed timestamps. If an edit would imply completion before receipt (e.g. the received time was corrected after counterchecking), the total is **clamped to 0** rather than stored negative.
- **Within policy** = counterchecked and `totalTimeMinutes <= 120`. Compliance rate = within-policy ÷ completed.
- **Type detection rules** (weekends and Sabah public holidays share the shift schedule):

  | When | Received between | Type |
  |---|---|---|
  | Mon–Fri | 08:00–16:59 | Office Hour |
  | Sat/Sun/Public holiday | 08:00–14:59 | IPP Shift |
  | Any day | anything else | On Call |

## Project structure

```
src/
  app/
    page.tsx            Dashboard
    indents/            Indent list, entry & counterchecking
    reports/            Category/ward/distribution reports
    wards/              Ward management
    about/
    error.tsx           Error boundary (retry UI)
    loading.tsx         Route loading state
    api/                REST route handlers (MongoDB-backed)
  components/shell.tsx  App shell (Mantine provider, nav, notifications)
  lib/
    mongodb.ts          Connection pooling + index bootstrap
    timezone.ts         Asia/Kuching helpers
    total-time.ts       Handling-time calculation (clamped)
    validation.ts       Shared server/client validation
    indent-type.ts      Type detection rules
    holiday.ts          Sabah public-holiday detection (tiered)
tests/                  Vitest suite (unit + API route tests with a mocked DB)
scripts/                One-off maintenance scripts (lint-exempt)
```

## Data integrity

- All API payloads are validated server-side (400 on malformed dates/times/types/counts, trimmed ward names, `ObjectId` guards).
- Ward names are unique **after trimming**; renames intentionally do not cascade to historical indents.
- `scripts/cleanup-data-2026-10-16.js` is a dry-run-first maintenance script from the 2026-10-16 data cleanup (blank types, negative totals, orphaned wards). Run it without flags to report; `--apply` to fix.

## Deployment

```bash
npm run build
npm start
```

Set `MONGODB_URI` in the deployment environment. The app targets a single-region hospital deployment; it has **no authentication**, so put it behind a trusted network or reverse-proxy auth.
