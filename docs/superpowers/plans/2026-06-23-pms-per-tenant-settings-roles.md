# Per-Tenant Settings & Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `property_settings`, `roles`, and `app_settings` per-company so each tenant has its own hotel profile, roles/permissions, and settings — and auto-provision a blank property + default roles for a new tenant on first login.

**Architecture:** Reuse the existing `BelongsToCompany` global scope on the 3 models; drop the hardcoded `property_settings.id=1`; scope the login-time role-name lookup by `company_id`; add an idempotent `TenantProvisioner::ensure()` called from `AuthController::login`.

**Tech Stack:** Laravel `hotel-pms-api`, PHP 8.4 via `C:\php84\php.exe`, PostgreSQL `hotel_pms` (shared), PHPUnit (sqlite :memory:).

## Global Constraints

- Run artisan/tests with `"C:/php84/php.exe" artisan ...` in `hotel-pms-api`. Local DB = shared `hotel_pms` (additive change approved).
- `company_id` columns: `unsignedBigInteger('company_id')->nullable()->index()`, **no DB FK** (consistent with the rest of the multi-tenant work).
- Tenant resolver = `App\Support\Tenant::id()`; global scope name = `company` (from `App\Models\Concerns\BelongsToCompany`).
- Default company code = `DEFAULT-HOTEL` (already exists; backfill target). It already owns the existing property/roles/settings after backfill, so `TenantProvisioner::ensure()` must no-op for it.
- Blocked-login statuses already return 403 before provisioning; a user reaching the provisioning call always has a non-null `company_id`.
- New tenant property row is **blank** (no pre-fill). Default role template (verbatim) is the `RolePagesSeeder` set: Owner/Admin = `['*']`; Manager/Reception/Housekeeping/Accounts/Restaurant/Maintenance with their page-key lists (reproduced in Task 3).
- Tests = PHPUnit classes (this app is NOT Pest); Feature tests use `RefreshDatabase` on sqlite :memory:.
- All migrations additive + reversible. `pg_dump` before any prod run (prod is a later, separate step — not in this plan).
- TDD: failing test → run (fail) → minimal impl → run (pass) → commit. Commit to the main repo (`d:/transfer the file/Downloads/myhotel-pms-source`), branch `feat/pos-setup-live-real`.

---

## File Structure

- `hotel-pms-api/database/migrations/2026_06_23_000020_company_id_on_settings_roles.php` — columns + backfill + app_settings unique swap.
- `hotel-pms-api/app/Models/{PropertySetting,Role,AppSetting}.php` — use `BelongsToCompany`.
- `hotel-pms-api/app/Http/Controllers/Api/PropertyController.php` — drop `id=1`.
- `hotel-pms-api/app/Http/Controllers/Api/AuthController.php` — scope role lookup by company_id; call provisioner.
- `hotel-pms-api/app/Support/TenantProvisioner.php` — new service.
- `hotel-pms-api/tests/Feature/PerTenantSettingsTest.php`, `tests/Feature/TenantProvisionTest.php`.

---

## Task 1: Migration — company_id on the 3 tables + backfill + app_settings unique swap

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_23_000020_company_id_on_settings_roles.php`

**Interfaces:**
- Produces: `company_id` (nullable, indexed) on `property_settings`, `roles`, `app_settings`; all existing rows backfilled to DEFAULT-HOTEL; `app_settings` unique is `(company_id, key)` (old `(key)` unique dropped).

- [ ] **Step 1: Write the migration**

`2026_06_23_000020_company_id_on_settings_roles.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = ['property_settings', 'roles', 'app_settings'];

    public function up(): void {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && !Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, fn (Blueprint $b) => $b->unsignedBigInteger('company_id')->nullable()->index());
            }
        }
        // app_settings: swap unique(key) -> unique(company_id, key)
        if (Schema::hasTable('app_settings')) {
            try { Schema::table('app_settings', fn (Blueprint $b) => $b->dropUnique('app_settings_key_unique')); } catch (\Throwable $e) {}
            Schema::table('app_settings', fn (Blueprint $b) => $b->unique(['company_id', 'key'], 'app_settings_company_key_unique'));
        }
        // backfill to DEFAULT-HOTEL
        $defaultId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');
        if ($defaultId) {
            foreach ($this->tables as $t) {
                if (Schema::hasColumn($t, 'company_id')) {
                    DB::table($t)->whereNull('company_id')->update(['company_id' => $defaultId]);
                }
            }
        }
    }

    public function down(): void {
        if (Schema::hasTable('app_settings')) {
            try { Schema::table('app_settings', fn (Blueprint $b) => $b->dropUnique('app_settings_company_key_unique')); } catch (\Throwable $e) {}
            try { Schema::table('app_settings', fn (Blueprint $b) => $b->unique('key', 'app_settings_key_unique')); } catch (\Throwable $e) {}
        }
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, fn (Blueprint $b) => $b->dropColumn('company_id'));
            }
        }
    }
};
```
NOTE: the old unique index name is conventionally `app_settings_key_unique`. If `dropUnique` errors because the name differs, the implementer finds the real index name (`\d app_settings` in psql) and uses it. On sqlite (tests) the dropUnique/unique still run via RefreshDatabase migration — Laravel handles the sqlite rebuild.

- [ ] **Step 2: Run + verify**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan migrate`
Expected: the one migration runs. If it tries to run other pending migrations, STOP and report.
Verify columns + backfill:
```
"C:/php84/php.exe" artisan tinker --execute="foreach(['property_settings','roles','app_settings'] as \$t){echo \$t.': '.(\Illuminate\Support\Facades\Schema::hasColumn(\$t,'company_id')?'has':'no').' nulls='.\Illuminate\Support\Facades\DB::table(\$t)->whereNull('company_id')->count().PHP_EOL;}"
```
Expected: each `has` and `nulls=0`.

- [ ] **Step 3: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add hotel-pms-api/database/migrations
git commit -m "feat(pms): company_id on property_settings/roles/app_settings + backfill; per-(company,key) settings unique"
```

---

## Task 2: Scope the 3 models; drop property id=1; scope login role lookup

**Files:**
- Modify: `hotel-pms-api/app/Models/PropertySetting.php`, `Role.php`, `AppSetting.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/PropertyController.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/AuthController.php` (role lookup only)
- Test: `hotel-pms-api/tests/Feature/PerTenantSettingsTest.php`

**Interfaces:**
- Consumes: `company_id` columns (Task 1); existing `App\Models\Concerns\BelongsToCompany`, `App\Support\Tenant`.
- Produces: `PropertySetting`/`Role`/`AppSetting` are company-scoped; `GET/PUT /api/property` operate on the current company's row; login role-permission lookup is scoped to the user's company.

- [ ] **Step 1: Write the failing test**

`tests/Feature/PerTenantSettingsTest.php`:
```php
<?php
use App\Models\User;
use App\Models\PropertySetting;
use App\Models\Role;
use App\Models\AppSetting;

function tenant(int $companyId, string $email): User {
    return User::create(['name' => 'U', 'email' => $email, 'password' => 'x', 'role' => 'Owner', 'company_id' => $companyId]);
}

class PerTenantSettingsTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    public function test_property_role_appsetting_are_company_scoped(): void {
        $a = tenant(501, 'pa@a.com'); $b = tenant(502, 'pb@b.com');

        $this->actingAs($a);
        PropertySetting::create(['property_name' => 'A Hotel']);
        Role::create(['name' => 'Manager', 'permissions' => ['/dashboard']]);
        AppSetting::create(['key' => 'preferences', 'value' => ['theme' => 'a']]);

        $this->assertSame(1, PropertySetting::count());
        $this->assertSame(1, Role::count());
        $this->assertSame('A Hotel', PropertySetting::first()->property_name);
        $this->assertSame(501, (int) PropertySetting::first()->company_id);

        $this->actingAs($b);
        $this->assertSame(0, PropertySetting::count(), 'B must not see A property');
        $this->assertSame(0, Role::count(), 'B must not see A roles');
        // B can hold the SAME app_settings key with a different value (composite unique)
        AppSetting::create(['key' => 'preferences', 'value' => ['theme' => 'b']]);
        $this->assertSame('b', AppSetting::where('key', 'preferences')->first()->value['theme']);
    }

    public function test_property_endpoint_uses_current_company_row(): void {
        $a = tenant(601, 'pe@a.com');
        $this->actingAs($a, 'sanctum');
        $this->getJson('/api/property')->assertOk()->assertJsonPath('company_id', 601);
        $this->putJson('/api/property', ['property_name' => 'Edited'])->assertOk()->assertJsonPath('property_name', 'Edited');
        $this->assertSame('Edited', PropertySetting::where('company_id', 601)->first()->property_name);
    }
}
```
(If `Role`/`AppSetting`/`PropertySetting` use `$guarded`, `create([...])` works; if `$fillable`, ensure the used keys + `company_id` are fillable — most PMS models use `$guarded = ['id']`.)

- [ ] **Step 2: Run to verify fail**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan test --filter=PerTenantSettingsTest`
Expected: FAIL (models not scoped; `/api/property` returns id=1 row without company_id).

- [ ] **Step 3: Apply the trait to the 3 models**

In `app/Models/PropertySetting.php`, `app/Models/Role.php`, `app/Models/AppSetting.php`: add `use App\Models\Concerns\BelongsToCompany;` to the top use-block and `use BelongsToCompany;` as the first line inside the class body. (These models use `$guarded`, so no fillable change needed.)

- [ ] **Step 4: Drop id=1 in PropertyController**

In `app/Http/Controllers/Api/PropertyController.php`, replace BOTH occurrences of `PropertySetting::firstOrCreate(['id' => 1])` with `PropertySetting::firstOrCreate([])`. (The global scope returns the current company's row; the `creating` hook stamps `company_id`. The empty-string/0 blank-handling in `update()` stays as-is.)

- [ ] **Step 5: Scope the login role lookup in AuthController**

In `app/Http/Controllers/Api/AuthController.php` line ~127, change:
```php
$r = Role::whereRaw('LOWER(name) = ?', [mb_strtolower($role)])->first();
```
to:
```php
$r = Role::where('company_id', $user->company_id)
    ->whereRaw('LOWER(name) = ?', [mb_strtolower($role)])->first();
```
(`$user` is the authenticated user in scope where this lookup runs — confirm the variable name in `userPayload`/`login`; it is the model whose `role` string is being resolved. The explicit `company_id` filter is required because the global scope is a no-op during login when `Auth::user()` is not yet set.)

- [ ] **Step 6: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=PerTenantSettingsTest`
Expected: PASS (2). Then full suite `"C:/php84/php.exe" artisan test` → green (was 128). If a pre-existing property/roles/settings test breaks because it assumed a single global row, adjust that test to act as a company (give its user a `company_id` + a `master_companies` row) — do NOT revert the scoping. Report any such adjustment.

- [ ] **Step 7: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add hotel-pms-api/app/Models/PropertySetting.php hotel-pms-api/app/Models/Role.php hotel-pms-api/app/Models/AppSetting.php hotel-pms-api/app/Http/Controllers/Api/PropertyController.php hotel-pms-api/app/Http/Controllers/Api/AuthController.php hotel-pms-api/tests/Feature/PerTenantSettingsTest.php
git commit -m "feat(pms): per-tenant property/roles/app_settings; scoped login role lookup"
```

---

## Task 3: TenantProvisioner — blank property + default roles on first login

**Files:**
- Create: `hotel-pms-api/app/Support/TenantProvisioner.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/AuthController.php` (call provisioner)
- Test: `hotel-pms-api/tests/Feature/TenantProvisionTest.php`

**Interfaces:**
- Consumes: scoped `PropertySetting`/`Role` (Task 2).
- Produces: `App\Support\TenantProvisioner::ensure(int $companyId): void` — idempotent; called from `AuthController::login` after the validity gate, before building the payload.

- [ ] **Step 1: Write the failing test**

`tests/Feature/TenantProvisionTest.php`:
```php
<?php
use App\Models\PropertySetting;
use App\Models\Role;
use App\Support\TenantProvisioner;

class TenantProvisionTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    public function test_ensure_seeds_blank_property_and_default_roles_once(): void {
        TenantProvisioner::ensure(701);

        $this->assertSame(1, PropertySetting::withoutGlobalScope('company')->where('company_id', 701)->count());
        $roles = Role::withoutGlobalScope('company')->where('company_id', 701)->pluck('name')->all();
        foreach (['Owner','Admin','Manager','Reception','Housekeeping','Accounts','Restaurant','Maintenance'] as $name) {
            $this->assertContains($name, $roles, "$name role should be seeded");
        }
        // blank property (no pre-fill)
        $this->assertSame('', (string) PropertySetting::withoutGlobalScope('company')->where('company_id', 701)->first()->property_name);

        // idempotent
        TenantProvisioner::ensure(701);
        $this->assertSame(1, PropertySetting::withoutGlobalScope('company')->where('company_id', 701)->count());
        $this->assertSame(count($roles), Role::withoutGlobalScope('company')->where('company_id', 701)->count());
    }
}
```

- [ ] **Step 2: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=TenantProvisionTest`
Expected: FAIL (class `App\Support\TenantProvisioner` not found).

- [ ] **Step 3: Write TenantProvisioner**

`app/Support/TenantProvisioner.php`:
```php
<?php
namespace App\Support;

use App\Models\PropertySetting;
use App\Models\Role;
use Illuminate\Support\Facades\Log;

class TenantProvisioner {
    /** Default role -> allowed page-keys (verbatim from RolePagesSeeder). */
    private const ROLE_DEFAULTS = [
        'Owner'   => ['*'],
        'Admin'   => ['*'],
        'Manager' => [
            '/dashboard', '/owner', '/rack', '/calendar', '/bookings', '/groups', '/checkin', '/checkout',
            '/enquiries', '/guests', '/loyalty', '/folio', '/halls', '/food', '/housekeeping', '/maintenance',
            '/lost-found', '/agents', '/accounts', '/pricing', '/cashier', '/inventory', '/vendors', '/staff',
            '/channels', '/website', '/notifications', '/night-audit', '/reports', '/setup', '/users',
            '/audit-logs', '/compliance', '/checkout/express', '/revenue/pace', '/revenue/pickup',
            '/revenue/restrictions', '/revenue/group-quote', '/revenue/comp-shop',
        ],
        'Reception' => [
            '/dashboard', '/rack', '/calendar', '/bookings', '/groups', '/checkin', '/checkout',
            '/enquiries', '/guests', '/folio', '/cashier', '/food', '/halls', '/checkout/express',
        ],
        'Housekeeping' => ['/dashboard', '/rack', '/housekeeping', '/maintenance', '/lost-found'],
        'Accounts'     => ['/dashboard', '/folio', '/accounts', '/cashier', '/reports', '/revenue/pace', '/revenue/pickup'],
        'Restaurant'   => ['/dashboard', '/food', '/halls', '/fb/pos', '/fb/kds', '/fb/recipes', '/fb/beo', '/fb/tables', '/fb/bar'],
        'Maintenance'  => ['/dashboard', '/maintenance', '/lost-found'],
    ];

    public static function ensure(int $companyId): void {
        try {
            $hasProperty = PropertySetting::withoutGlobalScope('company')->where('company_id', $companyId)->exists();
            if (!$hasProperty) {
                $p = new PropertySetting();
                $p->company_id = $companyId;
                $p->save(); // blank row; NOT NULL columns use their DB defaults ('' / 0)
            }
            $hasRoles = Role::withoutGlobalScope('company')->where('company_id', $companyId)->exists();
            if (!$hasRoles) {
                foreach (self::ROLE_DEFAULTS as $name => $pages) {
                    $r = new Role();
                    $r->company_id = $companyId;
                    $r->name = $name;
                    $r->permissions = $pages;
                    $r->save();
                }
            }
        } catch (\Throwable $e) {
            Log::warning("TenantProvisioner failed for company {$companyId}: " . $e->getMessage());
        }
    }
}
```
NOTE: if `$p->save()` fails on sqlite/pg because a `property_settings` column is NOT NULL without a DB default, set the known blank columns explicitly (`property_name => ''`, `default_advance => 0`, etc.) — the goal is one blank row. Keep it green.

- [ ] **Step 4: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=TenantProvisionTest`
Expected: PASS.

- [ ] **Step 5: Call the provisioner from login**

In `app/Http/Controllers/Api/AuthController.php` `login()`, AFTER the company-validity gate (the block that 403s suspended/expired/no_company) and BEFORE building the success payload (the `userPayload(...)` call / return), add:
```php
\App\Support\TenantProvisioner::ensure((int) $user->company_id);
```
(At this point `$user->company_id` is guaranteed non-null — the no-company case already returned 403. Ensure runs before `userPayload` so the role lookup finds the seeded roles.)

- [ ] **Step 6: Full suite + commit**

Run: `"C:/php84/php.exe" artisan test` → green.
```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add hotel-pms-api/app/Support/TenantProvisioner.php hotel-pms-api/app/Http/Controllers/Api/AuthController.php hotel-pms-api/tests/Feature/TenantProvisionTest.php
git commit -m "feat(pms): provision blank property + default roles for new tenant on first login"
```

---

## Task 4: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full backend suite**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan test` → all green.

- [ ] **Step 2: Live new-tenant provisioning**

Ensure PMS API on :8000 (restart to load changes: `"C:/php84/php.exe" artisan serve --port=8000`). Using the existing **Beta** tenant (owner@beta.com / Secret@123) which had no property/roles before this change:
- `POST :8000/api/login` as Beta owner → 200.
- `GET :8000/api/property` (with the token) → returns a row with `company_id` = Beta's id and a **blank** `property_name`.
- `GET :8000/api/roles` → returns the 8 default roles (Owner, Admin, Manager, Reception, Housekeeping, Accounts, Restaurant, Maintenance).

- [ ] **Step 3: Per-tenant isolation of settings**

- As Beta: `PUT :8000/api/property {"property_name":"Beta Hotel"}` → 200.
- As **Alpha** (owner@alpha.com): `GET :8000/api/property` → its own row, NOT "Beta Hotel".
- As default hotel (admin@hotel.com if pw known): `GET :8000/api/property` → "The Pearl Palace" (existing), unaffected.
- `PUT :8000/api/settings/preferences {"value":{"theme":"beta"}}` as Beta and a different value as Alpha → each reads back its own (composite unique holds).

- [ ] **Step 4: Frontend sanity**

With luxe-pms running (:3000), log in as Beta → Setup screen shows a blank property + the default roles list. Edit + save property → persists. Log in as Alpha → its own property, unaffected. (No frontend code changes expected; confirm it works.)

- [ ] **Step 5: Final commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source" && git add -A && git commit -m "chore(pms): per-tenant settings/roles verified end-to-end" --allow-empty
```

---

## Self-Review notes

- **Spec coverage:** company_id + backfill on the 3 tables ✓ (T1), app_settings composite unique ✓ (T1), trait scoping ✓ (T2), PropertyController id=1 removal ✓ (T2), scoped login role lookup ✓ (T2), TenantProvisioner blank-property + default-roles + idempotent ✓ (T3), call on login before payload ✓ (T3), tests + live e2e ✓ (T2–T4).
- **No-op for default company:** ensure() checks existence first; the backfilled default hotel already has property + roles, so nothing is duplicated.
- **Cross-tenant role-name collision** is the subtle correctness fix (T2 Step 5) — explicitly scoped because Auth context is absent during login.
- **Naming consistency:** `TenantProvisioner::ensure(int)`, global scope `company`, `company_id`, `DEFAULT-HOTEL`, role names match the seeder template, `withoutGlobalScope('company')` used in provisioner + tests for Auth-independent correctness.
