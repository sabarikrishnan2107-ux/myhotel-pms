# masterhotel — Super-Admin Control Plane (Phase 1 Design)

**Date:** 2026-06-22
**Status:** Approved design → implementation plan next
**Location:** new folder `D:\masterhotel\` (separate from `myhotel-pms-source`)

## 1. Purpose

A standalone super-admin application where the platform owner onboards and governs
client hotel **companies** (tenants). It is the **control plane**: it owns each
company's identity, the admin login credential issued to that company, the licence
**validity window** (valid from → to), the subscription **plan & limits**, and the
company's **branches**. It is separate from any single hotel's day-to-day PMS.

The headline capability: create a company, issue it a login, and bound that login to
a validity period — so an expired or suspended company cannot log in.

## 2. Scope (Phase 1)

In scope:
- Super-admin authentication (dedicated master credential).
- Company CRUD: identity, admin login credential, validity window, plan, limits, modules, status.
- Branch CRUD under each company (name, code, city, rooms_count, employees_count), enforcing plan limits.
- Dashboard stat cards (total / active / expiring / expired).
- Audit log of super-admin actions.
- The Next.js panel (navy-gold theme from `hrms-master-sample.html`) wired to real data.
- Seed: one super-admin + a few sample companies/branches.
- Runs **locally** against a local copy of `hotel_pms`.

Out of scope (later phases):
- **Phase 2:** deploy to production server `168.144.26.131` on a subdomain.
- **Phase 3:** PMS login integration — PMS calls `tenant/authenticate` so validity gates real logins.

## 3. Architecture

```
D:\masterhotel\
  masterhotel-api\     Laravel 13 / PHP 8.3 / Postgres (Sanctum auth)
  masterhotel-web\     Next.js 16 / React 19 / TypeScript (admin panel)
```

- Mirrors the existing `myhotel-pms-source` layout (api + web) for consistency and reuse.
- **Database:** the existing live `hotel_pms` Postgres database is reused. Master tables
  are **additive and namespaced** so they never collide with the 95 PMS tables:
  `super_admins`, `master_companies`, `master_branches`, `master_audit_logs`.
  - Local dev points `.env` at the **local** `hotel_pms` (127.0.0.1:5432, `postgres`/`sabari12345`).
  - Production (Phase 2) points at the server's live `hotel_pms` (127.0.0.1 on the server).
  - The same additive migrations run in both; **`pg_dump` backup before any prod migrate**.

## 4. Data model

### `super_admins`
Platform owners who log into the master panel.
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| name | string | |
| email | string unique | seed: `master@akilgroup.com` |
| password | string | hashed (bcrypt); force change on first login |
| is_active | bool | default true |
| timestamps | | |

### `master_companies`
One row per tenant company.
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| name | string | "Grand Palace Resorts" |
| code | string unique | the company id, e.g. `GPR-001` |
| logo_path | string null | |
| gst_no | string null | |
| contact_email | string null | |
| contact_phone | string null | |
| address | text null | |
| admin_email | string | issued company login (unique) |
| admin_password | string | hashed; the company's login credential |
| force_password_change | bool | default true |
| valid_from | date | licence start |
| valid_to | date | licence end (`valid_to > valid_from`) |
| plan | string | starter / professional / enterprise |
| max_branches | int | limit |
| max_rooms | int | limit |
| max_employees | int | limit |
| modules | jsonb | enabled module keys, e.g. ["front_office","hk","accounts","hrms"] |
| status | string | active / suspended (manual). expiring/expired derived from dates |
| timestamps | | |

### `master_branches`
Branches/properties belonging to a company.
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| company_id | fk → master_companies | cascade delete |
| name | string | |
| code | string | unique per company |
| city | string null | |
| address | text null | |
| rooms_count | int | default 0; sum ≤ company.max_rooms |
| employees_count | int | default 0; sum ≤ company.max_employees |
| is_active | bool | default true |
| timestamps | | |

### `master_audit_logs`
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| super_admin_id | fk null | actor |
| action | string | created / updated / suspended / reactivated / password_reset |
| entity | string | company / branch |
| entity_id | bigint | |
| meta | jsonb null | before/after snippet |
| created_at | timestamp | |

### Derived status logic
Effective status shown in the UI is computed:
- `suspended` if `status = suspended`
- else `expired` if `today > valid_to`
- else `expiring` if `valid_to` within 30 days
- else `active`

## 5. API (Laravel `/api`)

Auth (Sanctum bearer token):
- `POST /api/auth/login` — super-admin email+password → token
- `POST /api/auth/logout`
- `GET  /api/auth/me`

Companies:
- `GET    /api/companies` — list; query: `search`, `status` filter; includes branch count + effective status
- `POST   /api/companies` — create (identity + admin login + validity + plan + limits + modules)
- `GET    /api/companies/{id}` — detail incl. branches + recent audit
- `PUT    /api/companies/{id}` — update
- `PATCH  /api/companies/{id}/status` — suspend / reactivate
- `POST   /api/companies/{id}/reset-password` — reissue admin credential

Branches:
- `GET    /api/companies/{id}/branches`
- `POST   /api/companies/{id}/branches` — 422 if would exceed `max_branches` / `max_rooms` / `max_employees`
- `PUT    /api/branches/{id}`
- `DELETE /api/branches/{id}`

Dashboard / audit:
- `GET /api/dashboard/stats` — totals for the four stat cards
- `GET /api/audit-logs`

Validation rules:
- `code` unique; `admin_email` unique; valid email formats.
- `valid_to > valid_from`.
- password strength (min 8, mixed); confirm match on create.
- branch additions respect company limits (server-enforced, not just UI).

### Tenant authenticate (built now, consumed in Phase 3)
- `POST /api/tenant/authenticate` — body `{email, password}` → `{valid: bool, company?, reason?}`
  - reasons: `invalid_credentials`, `before_valid_from`, `expired`, `suspended`, `ok`
  - This is the contract the PMS login will later call to enforce validity.

## 6. Frontend (Next.js, `masterhotel-web`)

Reuses the approved navy-gold glass theme (Inter + Fraunces) from `hrms-master-sample.html`.

Pages:
- `/login` — super-admin login.
- `/dashboard` — four stat cards + recent audit activity.
- `/companies` — the **Company Master** table (search, status chips, pagination) +
  slide-over **create/edit** drawer with the three field groups: Company Identity,
  Admin Login Credentials, Validity & Plan (+ module toggles).
- `/companies/[id]` — company profile, **branches** sub-table (add/edit, shows usage vs limits),
  audit trail, suspend/reactivate + reissue-password actions.

Shared:
- API client with bearer token (axios or fetch wrapper), `NEXT_PUBLIC_API_URL` env.
- Auth guard / redirect to `/login` when unauthenticated.
- Theme toggle (dark/light), consistent with PMS.

## 7. Error handling

- API returns Laravel JSON validation errors (422) with field messages; the drawer
  surfaces them inline per field.
- Limit violations (branches/rooms/employees over plan) return 422 with a clear message.
- Auth failures return 401; frontend clears token and redirects to `/login`.
- Suspended/expired company attempting `tenant/authenticate` returns `valid:false` + reason.

## 8. Testing

- **Backend (PHPUnit/Pest):** auth login; company create with validation (unique code,
  date order, password); branch limit enforcement; status derivation (active/expiring/
  expired/suspended); `tenant/authenticate` for each reason; audit-log writes.
- **Frontend:** the panel renders real list data; create drawer posts and refreshes;
  validation errors show; suspend toggles status badge.
- **Manual:** seed → log in as super-admin → create a company with a 1-year validity →
  see it Active → set valid_to in the past → see it Expired → `tenant/authenticate` returns expired.

## 9. Seed data

- 1 super-admin (`master@akilgroup.com`, temp password, force-change).
- 4–5 sample companies across plans with varied validity (active / expiring / expired)
  and 1–3 branches each — so the panel looks real on first run (then cleared before go-live).

## 10. Build phases

1. **Phase 1 (this spec):** scaffold both apps in `D:\masterhotel`, additive migrations on
   local `hotel_pms`, super-admin auth, companies + branches CRUD with limits & validity,
   dashboard, audit log, panel wired to real data, seed. Verify locally end-to-end.
2. **Phase 2:** deploy to `168.144.26.131` on a subdomain (nginx + php-fpm + the live
   `hotel_pms`), backup-before-migrate, HTTPS where possible.
3. **Phase 3:** wire the PMS login to call `tenant/authenticate` so validity gates real logins.
