# Per-Tenant Settings & Roles — Design

**Date:** 2026-06-23
**Status:** Approved design → implementation plan next
**Scope:** Make `property_settings`, `roles`, and `app_settings` per-company in the hotel PMS (`hotel-pms-api`), so each tenant has its own hotel profile, role/permission set, and settings — completing the multi-tenant isolation (these 3 tables were intentionally left global in the earlier rollout).

## 1. Background / current state

- The PMS is multi-tenant via a `BelongsToCompany` Eloquent global scope (filters by `Tenant::id()` = `Auth::user()->company_id`, auto-stamps on insert). ~80 models use it.
- Left GLOBAL (this spec fixes them):
  - `property_settings` — single hardcoded row `id=1`; `PropertyController` GET/PUT `/api/property` uses `firstOrCreate(['id'=>1])` ([PropertyController.php:17,55]). Columns: property_name, owner_email, branch, currency, gstin, pan, logo, etc.
  - `roles` — multi-row set; managed via generic ResourceController `/api/roles`; `permissions` is a JSON page-key array. A staff user's role is the **name string** in `users.role`, matched at login by `Role::whereRaw('LOWER(name)=?')` ([AuthController.php:124-129]). Default set seeded by `RolePagesSeeder` (Owner, Admin, Manager, Reception, Housekeeping, Accounts, Restaurant, Maintenance).
  - `app_settings` — key/value store (`SettingsController` GET/PUT `/api/settings/{key}` via `firstOrCreate(['key'=>$key])`); keys include `smtp`, `preferences`, `setup-progress`. Unique index on `key` alone. SMTP also flows through it via `SmtpSettingsController`.
- No new-tenant provisioning hook exists.

## 2. Goal

Each tenant company gets its own property record, its own roles/permissions, and its own settings, fully isolated. A brand-new tenant, on first PMS login, is auto-provisioned with a **blank** property row and the **default role set**, so they can immediately run Setup and assign staff. The existing default hotel is unaffected.

## 3. Schema changes (one additive migration)

- Add `company_id` (`unsignedBigInteger`, nullable, indexed, **no DB FK**) to `property_settings`, `roles`, `app_settings`.
- Backfill every existing row in those 3 tables to the `DEFAULT-HOTEL` company id (so the current hotel keeps its property, roles, and settings).
- `app_settings`: drop the unique index on `(key)` and add a composite unique on `(company_id, key)` — so each company can hold its own row per key.
- Migration additive + reversible (`down()` drops the column / restores the single-key unique). `pg_dump` before any prod run.

## 4. Scoping (apply existing pattern)

- `PropertySetting`, `Role`, `AppSetting` models: `use App\Models\Concerns\BelongsToCompany;`.
- `PropertyController`: replace `firstOrCreate(['id'=>1])` (both GET and PUT) with `PropertySetting::firstOrCreate([])`. The global scope returns the current company's row; the `creating` hook stamps `company_id`. Drop all `id=1` hardcoding.
- `SettingsController` GET/PUT: `AppSetting::firstOrCreate(['key'=>$key])` is unchanged — the global scope adds `company_id` to the lookup and the creating hook stamps it, so it is automatically per-tenant. `SmtpSettingsController` likewise (it reads/writes the `smtp` AppSetting).
- **AuthController role lookup fix:** at login, `Auth::user()` is not yet set, so the global scope is a no-op and a bare `Role::whereRaw('LOWER(name)=?')` could match another company's same-named role. Change that lookup to be explicitly scoped: `Role::where('company_id', $user->company_id)->whereRaw('LOWER(name)=?', [...])->first()`. (Owner/Admin still short-circuit to `['*']` as today.)

## 5. New-tenant provisioning (idempotent, on first login)

New service `App\Support\TenantProvisioner`:
```
TenantProvisioner::ensure(int $companyId): void
```
- If `PropertySetting` for the company does not exist → create a **blank** row stamped with `company_id` (no field pre-fill; tenant completes Setup).
- If the company has **no roles** → seed the default role set (the `RolePagesSeeder` template: Owner, Admin, Manager, Reception, Housekeeping, Accounts, Restaurant, Maintenance, each with its `permissions` page-key array), every row stamped with `company_id`.
- `app_settings` are created lazily per key by `SettingsController`, so nothing is pre-seeded.
- Idempotent: existence checks first; running twice does not duplicate.
- Queries inside `ensure()` use `withoutGlobalScope` or explicit `where('company_id', $companyId)` so they are correct regardless of the current Auth context.

Call site: `AuthController::login`, after successful authentication and the company-validity gate, **before** building the user payload, wrapped in try/catch so a provisioning failure is logged but never blocks a valid login. The `DEFAULT-HOTEL` company already has property + roles (backfilled), so `ensure()` no-ops for it.

## 6. Error handling / safety

- Additive, reversible migration; backfill to default company; `pg_dump` before prod.
- `ensure()` is best-effort (try/catch + log); login never fails because of provisioning.
- Scoped role lookup prevents cross-tenant role-name collisions.
- No new DB-level FKs (consistent with the rest of the multi-tenant work).

## 7. Testing

**Backend (PHPUnit, sqlite :memory:):**
- Migration/backfill: existing property/roles/settings rows carry the default `company_id`; `app_settings` unique is `(company_id, key)`.
- Scope: acting as company A, `PropertySetting`/`Role`/`AppSetting` queries return only A's rows; inserts auto-stamp `company_id`.
- Provisioning: a new company with no property/roles → after `TenantProvisioner::ensure()` (or a login), it has exactly one blank property row + the full default role set, all stamped to it; a second call adds nothing (idempotent).
- Role permissions at login: company A and company B each have a role named "Manager" with different permissions; logging in as A's "Manager" user returns A's permissions (scoped lookup).
- app_settings per-tenant: A and B can both store `key='preferences'` with different values (composite unique holds).

**Live end-to-end:**
- Log into a **new** tenant (e.g. Beta) → Setup shows a **blank** property + the **default roles**; edit the property and save → persists to Beta's row only; Alpha/default hotel unchanged.
- Confirm SMTP set for one tenant doesn't appear for another.

## 8. File touch-list

- `hotel-pms-api/database/migrations/2026_06_23_000020_company_id_on_settings_roles.php` (columns + backfill + app_settings composite unique).
- `hotel-pms-api/app/Models/{PropertySetting,Role,AppSetting}.php` — use `BelongsToCompany`.
- `hotel-pms-api/app/Http/Controllers/Api/PropertyController.php` — drop `id=1`.
- `hotel-pms-api/app/Http/Controllers/Api/AuthController.php` — scoped role lookup + call `TenantProvisioner::ensure()`.
- `hotel-pms-api/app/Support/TenantProvisioner.php` — new.
- `hotel-pms-api/tests/Feature/PerTenantSettingsTest.php`, `tests/Feature/TenantProvisionTest.php`.

## 9. Out of scope

- Frontend changes: the Setup screen already calls `/property`, `/roles`, `/settings/{key}` — they become per-tenant transparently. Verify live; no planned UI edits.
- Per-tenant SMTP UI (works automatically via app_settings scoping).
- `meal_plans` / `gst_slabs` remain global statutory reference (unchanged).
- Making `users.role` a real FK (it stays a name string; the scoped lookup is sufficient).
