# Multi-Tenant PMS — Thin-Slice Design

**Date:** 2026-06-23
**Status:** Approved design → implementation plan next
**Scope:** Make the existing single-tenant hotel PMS (`hotel-pms-api` + `luxe-pms`) serve many isolated tenant companies created in the masterhotel control plane, starting with a proven vertical slice. Shared-database, row-level isolation via `company_id`.

## 1. Background / current state

- `hotel-pms-api` is **single-tenant**: no `company_id`/`tenant_id` on any table; all queries unscoped (e.g. `ResourceController::index`). One shared dataset, one hotel.
- PMS auth: `POST /login` against the `users` table (Sanctum tokens); roles via `users.role` + a `roles` table with JSON permissions. No company concept.
- `luxe-pms` nav (`src/lib/nav.ts`) is hard-coded; pages gated only by a role string + `pms_pages` permission list.
- masterhotel control plane already stores each company (`master_companies`: admin_email/admin_password, valid_from/to, status, plan, **modules** JSON, limits) and shares the **same `hotel_pms` database** as the PMS.
- Nothing in the PMS references masterhotel yet.

## 2. Goal

Creating a company in masterhotel yields a tenant whose Owner can log into the PMS and **see only that company's hotel data and only the modules it is licensed for**, with the licence validity (expiry/suspension) enforced at login — without breaking the existing hotel's login or data.

## 3. Credential realms (hard rule)

Two separate, non-crossing auth realms:
- **Super-admin** → `super_admins` table → **masterhotel panel only**. Never present in PMS `users`, so it cannot log into the PMS.
- **Tenant PMS users** → `users` table, each row carries `company_id` → **PMS only**. Never present in `super_admins`, so they cannot log into masterhotel.

The masterhotel super-admin login (`master@akilgroup.com`) and any tenant PMS login are mutually exclusive by construction.

## 4. Tenant identity & data model

- A "company"/tenant = a row in the existing **`master_companies`** table (shared DB).
- Add nullable `company_id` (bigint, FK → `master_companies.id`, indexed) to:
  - `users` (which tenant a PMS user belongs to)
  - **Slice data tables:** `guests`, `bookings`, `rooms`, `folio_charges`, `folio_payments`, `folio_adjustments`
- A **default company** row is created automatically (code `DEFAULT-HOTEL`, status active, wide validity, all modules) to hold the EXISTING hotel data; every current `users` + slice-table row is backfilled to it. `admin@hotel.com` keeps working, scoped to the default company.
- `company_id` is nullable in the schema (so additive migration + backfill is safe), but treated as required in application logic after backfill.

## 5. Provisioning: create company → usable PMS login

In masterhotel `CompanyController::store` (and `resetPassword`), after writing `master_companies`, **sync a PMS `users` row** (same shared DB):
- On create: insert `users` row → `email = admin_email`, `password = master_companies.admin_password` (copy the bcrypt hash directly — portable, no plaintext needed), `name = company name + " Owner"`, `role = 'Owner'`, `status = 'active'`, `company_id = new company id`. Use `updateOrCreate` keyed on `email` to stay idempotent.
- On `resetPassword`: update that `users` row's password hash to match.
- On `update` (if `admin_email` changes): update the matching `users` row's email.
- The Owner can then create staff users inside the PMS; new users inherit the creator's `company_id` (set server-side, never from client input).

## 6. PMS login gate

Modify `hotel-pms-api` `AuthController::login`:
1. Find user by email in `users`, verify password (unchanged).
2. Load `company_id`; look up the company in `master_companies`.
3. Derive status (reuse the same logic as masterhotel's `CompanyStatus`: suspended > expired > before-valid_from > expiring > active). If **suspended / expired / before valid_from**, return **403** with `{ reason }` (`suspended` | `expired` | `before_valid_from`) and issue no token. `expiring` and `active` proceed.
4. Issue the Sanctum token as today; include `company_id` + `modules` in the `/login` and `/me` payloads.
- A user with `company_id = null` (shouldn't happen post-backfill) is treated as the default company.
- Super-admins are not in `users`, so they fail step 1 → cannot log in (realm rule upheld).

## 7. Data isolation (global scope)

- New trait `App\Models\Concerns\BelongsToCompany` adding:
  - an Eloquent **global scope** that appends `where('company_id', <current company id>)` to every query;
  - a `creating` hook that auto-stamps `company_id = <current company id>` when not set.
- "Current company id" resolver: `App\Support\Tenant::id()` reads `Auth::user()?->company_id` (request-scoped). When unauthenticated/console, the scope is a no-op (so seeders/migrations and the super-admin context are unaffected).
- Apply the trait to the slice models: `Guest`, `Booking`, `Room`, `FolioCharge`, `FolioPayment`, `FolioAdjustment`.
- Result: tenant A's token only ever reads/writes A's rows; inserts are auto-tagged. No controller changes needed (scope is centralized).

## 8. Module permissions (frontend gating this slice)

- `master_companies.modules` (JSON, keys e.g. `front_office, hk, accounts, hrms, pos, banquets, channel_mgr`) = the tenant's licensed modules.
- PMS `/login` + `/me` return `company` + `modules`.
- `luxe-pms`: add a `module?: string` to nav items (or a group→module map in `nav.ts`); the sidebar hides any item whose module isn't in the tenant's `modules`. Pages with no module are always visible (core). Store `modules` in localStorage alongside `pms_pages`.
- Backend per-endpoint module enforcement is **out of scope for the slice** (frontend gating + the data isolation cover the security-critical path); added in the full rollout.

## 9. Error handling

- Blocked login → HTTP 403 `{ message, reason }`; `luxe-pms` login screen shows a friendly message ("Your licence has expired / been suspended — contact your provider").
- Missing/invalid company on a token → treated as default company (never a 500).
- All new migrations additive and reversible; **`pg_dump` before running on prod** (standing rule).

## 10. Testing

**Backend (PMS, Pest/PHPUnit):**
- Login blocked for expired/suspended/before-valid-from company (403 + reason); allowed for active/expiring.
- Global scope: seeding two companies, querying as A returns only A's bookings/guests/rooms/folios; insert as A auto-tags `company_id = A`.
- Provisioning: masterhotel `store` creates the matching `users` row with the same password hash + `company_id`; `resetPassword` updates it.
- Backfill migration: a default company exists and all pre-existing rows carry its `company_id`.

**End-to-end manual (the professional pass requested):**
1. Create Company A and Company B in masterhotel (each: Owner login + modules).
2. PMS login as A's Owner → only A's (empty) data; create a booking + guest.
3. PMS login as B's Owner → cannot see A's data; create B's own.
4. Re-check A → still cannot see B's data.
5. Set A expired/suspended in masterhotel → A's PMS login blocked with reason.
6. Disable a module for A → that nav section disappears for A.
7. `master@akilgroup.com` cannot log into the PMS; A's Owner cannot log into masterhotel.

## 11. File touch-list (slice)

**masterhotel-api:** `app/Http/Controllers/CompanyController.php` (sync PMS `users` row on store/resetPassword/update); a lightweight `users`-table writer (raw `DB::table('users')` or a minimal `PmsUser` model).

**hotel-pms-api:**
- migration: add `company_id` to `users` + the 6 slice tables; create default company + backfill.
- `app/Support/Tenant.php` (current company resolver); `app/Models/Concerns/BelongsToCompany.php` (trait + global scope).
- models `Guest, Booking, Room, FolioCharge, FolioPayment, FolioAdjustment` use the trait; `User` gets `company_id` fillable.
- `app/Http/Controllers/Api/AuthController.php` (validity gate + company/modules in payload); a `CompanyStatus` helper (port of masterhotel's).
- tests under `tests/Feature`.

**luxe-pms:** `src/lib/nav.ts` (module tags), `src/lib/auth.ts` (store/read `modules`), `src/components/shell/sidebar.tsx` (filter by module), login screen (show blocked reason).

## 12. Out of scope (later full rollout)

- `company_id` on the remaining ~25 PMS tables + their models.
- Backend per-endpoint module/permission enforcement (middleware/policies).
- Multi-branch/property per company; company switcher; cross-tenant super-admin "impersonate".
- Deploying any of this to production (separate, ask-first step).
