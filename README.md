# MYHOTEL PMS

A full hotel **Property Management System** — a single repository containing a database-backed Laravel API and a Next.js UI.

```
myhotel-pms-source/
├─ luxe-pms/        # Frontend — Next.js 16 + React 19 + Tailwind
└─ hotel-pms-api/   # Backend  — Laravel 13 + PostgreSQL + Sanctum
```

Every screen in the navigation is wired to the database through the API — bookings, folios, housekeeping, F&B, cashier, accounts, loyalty, group & banquet bookings, compliance, channel manager, AI pricing, website engine, and the full Setup & Settings. The app ships with seed data so it is usable immediately after install.

---

## Quick start

You need **PostgreSQL**, **PHP 8.4** (with `pdo_pgsql`), **Composer**, and **Node 20+**.

### 1. Database
Create an empty PostgreSQL database named `hotel_pms`.

### 2. Backend — `hotel-pms-api`
```bash
cd hotel-pms-api
composer install
cp .env.example .env          # set DB_* for your local Postgres (database: hotel_pms)
php artisan key:generate
php artisan migrate --seed    # creates the schema and loads seed data
php artisan serve             # http://localhost:8000
```
Requires PHP with the `pdo_pgsql` extension. `.env` is git-ignored — never commit credentials.

### 3. Frontend — `luxe-pms`
```bash
cd luxe-pms
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev                   # http://localhost:3000
```

### 4. Log in
```
Email:    admin@hotel.com
Password: password123
```

---

## What's real

The backend persists every module to PostgreSQL. Highlights:

- **Front office** — Guests, Bookings, Calendar (drag-to-reschedule), Room Rack, Check-in / Check-out, Folio (charges & payments), Night Audit
- **Operations** — Housekeeping, Maintenance (assign + status board), Enquiries, Lost & Found, Inventory, Staff, Vendors
- **F&B** — Menu, POS / KDS (orders post to guest folios)
- **Revenue & finance** — Cashier shift close-out (totals from real payments), Accounts day-book + actual P&L, AI Pricing rules
- **Sales** — Group bookings + rooming list, Hall / Banquet bookings, Loyalty (members, tiers, rewards, campaigns)
- **Admin** — User management, Channel manager, Website booking engine, Compliance (licenses + Form-C/FRRO register), Audit log, full Setup & Settings
- **Dashboards & reports** — KPIs and source-mix computed from live data

### Security
- Token auth via **Laravel Sanctum**; **TOTP 2FA** (RFC-6238) enforced at login
- The Security settings are enforced, not cosmetic:
  - **Lockout after N failed attempts** (per email + IP, 15-minute window)
  - **Password policy** (Standard / Strong / Enterprise) enforced at change-password
  - **Session timeout** applied as a per-token expiry
- Every create / update / delete across all resources is written to an **audit log** (user, IP, device, severity)

### What needs external services (not implemented)
Two-way OTA sync, e-invoice IRN generation, FRRO portal submission, scheduled auto-backups, and live integration keys all require third-party credentials/APIs. The corresponding registers and configuration are real; the outbound calls to those services are not wired.

---

## Architecture

- **Generic resource layer** — most CRUD lives in a single `ResourceController` driven by a slug→model map with per-resource validation rules (39 resources). Adding a module is: migration + model + one map entry.
- **Dedicated controllers** for cross-cutting work — `AuthController` (login / 2FA / password / session), `StatsController` (dashboard + room board), `NightAuditController`, `ShiftController` (cashier), `BackupController` (pg_dump / psql), `AuditLogController`, `PropertyController`, `SettingsController` (JSON settings by key).
- **camelCase columns** to match the TypeScript types the frontend already uses.
- **Frontend** loads each page on mount via `apiGet`, and persists mutations via `apiPost` / `apiPut` / `apiDelete` from `src/lib/api.ts`. A bearer token is kept in `localStorage`; a 401 clears it and redirects to `/login`.

---

## Testing & CI

```bash
# Backend — 60 feature/unit tests on an in-memory SQLite database (never touches dev data)
cd hotel-pms-api && php artisan test

# Frontend — 16 Vitest unit tests (money / GST / PAN / Aadhaar / class-merge)
cd luxe-pms && npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs both suites on every push and pull request:
- **Backend** — PHP 8.4 → `composer install` → `php artisan test`
- **Frontend** — Node 22 → `npm ci` → `npm run lint` (gating) → `npm test`

---

## Project layout

```
hotel-pms-api/
├─ app/Http/Controllers/Api/   # ResourceController + dedicated controllers
├─ app/Models/                 # Eloquent models (camelCase columns)
├─ app/Support/Totp.php        # RFC-6238 TOTP
├─ database/migrations/        # 28 migrations
├─ database/seeders/           # 21 seeders (DatabaseSeeder orchestrates)
├─ routes/api.php              # public /login + Sanctum-protected routes
└─ tests/Feature, tests/Unit

luxe-pms/
├─ src/app/(app)/              # one folder per PMS screen
├─ src/lib/api.ts              # fetch helpers + auth
├─ src/lib/utils.ts            # money / GST / validators (unit-tested)
└─ vitest.config.ts
```
