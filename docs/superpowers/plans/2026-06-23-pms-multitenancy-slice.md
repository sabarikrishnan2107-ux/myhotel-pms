# Multi-Tenant PMS — Thin Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single-tenant hotel PMS isolate data per tenant company (created in masterhotel) via a `company_id` global scope, gate PMS login on company validity, provision a PMS Owner login when a company is created, and hide unlicensed modules — proven end-to-end on a vertical slice (Booking/Guest/Room/Folio).

**Architecture:** Shared `hotel_pms` database, row-level isolation. Add nullable `company_id` to `users` + 6 core tables; a `BelongsToCompany` trait adds an Eloquent global scope that auto-filters by the authenticated user's `company_id` and auto-stamps it on insert. The PMS login reads the company from `master_companies` (same DB) and blocks expired/suspended. masterhotel provisions a matching `users` row on company create. The frontend hides nav items whose module isn't licensed.

**Tech Stack:** Laravel (hotel-pms-api + masterhotel-api), PHP 8.4 via `C:\php84\php.exe`, PostgreSQL `hotel_pms`, Pest (sqlite :memory: for tests), Next.js (luxe-pms).

## Global Constraints

- Run artisan/tests with `"C:/php84/php.exe" artisan ...` in each app dir. Composer (masterhotel) = `"C:/php84/php.exe" "C:/Users/sabar/.config/herd/bin/composer.phar"`.
- Local DB: pgsql `hotel_pms` @ 127.0.0.1:5432, postgres/sabari12345 (shared by PMS + masterhotel). PMS dev server runs on **:8000**; masterhotel on **:8001** / web :3100.
- `company_id` columns are `unsignedBigInteger('company_id')->nullable()->index()` with **NO database foreign key** (master_companies is owned by masterhotel's migrations; the relation is application-level). This keeps each app's migrations independent and avoids cross-table FK failures on the sqlite test DB.
- Tenant resolver = `App\Support\Tenant::id()` → `Auth::user()?->company_id` (null when unauthenticated → global scope is a no-op, so console/seeders/migrations are unaffected).
- Default company code = `DEFAULT-HOTEL`. Status derivation order: suspended > expired > pending(before valid_from) > expiring > active. Blocked login statuses: suspended, expired, pending → HTTP 403 with `{reason}` (`suspended|expired|before_valid_from`).
- Module keys: `front_office, hk, accounts, hrms, pos, banquets, channel_mgr`.
- All migrations additive + reversible. Never modify existing PMS tables' existing columns. `pg_dump` before any prod run (prod is a later, separate step — do not deploy in this plan).
- TDD: failing test → run (fail) → minimal impl → run (pass) → commit. PMS Feature tests use `uses(RefreshDatabase::class)` (check tests/Pest.php; add if missing).

---

## File Structure

**hotel-pms-api:**
- `database/migrations/2026_06_23_000001_ensure_master_companies_table.php` — guarded create (test/standalone safety; skips on shared DB).
- `database/migrations/2026_06_23_000002_add_company_id_to_tenant_tables.php` — company_id on users + 6 tables.
- `database/migrations/2026_06_23_000003_backfill_default_company.php` — default company + backfill.
- `app/Support/Tenant.php` — current-company resolver.
- `app/Support/CompanyStatus.php` — status derivation (port of masterhotel's).
- `app/Models/Concerns/BelongsToCompany.php` — trait (global scope + creating hook).
- Modify models: `Guest, Booking, Room, FolioCharge, FolioPayment, FolioAdjustment` (use trait), `User` (company_id fillable).
- Modify `app/Http/Controllers/Api/AuthController.php` — validity gate + company/modules payload.
- Tests: `tests/Feature/TenantScopeTest.php`, `tests/Feature/LoginValidityTest.php`.

**masterhotel-api:**
- Modify `app/Http/Controllers/CompanyController.php` — provision/sync PMS `users` row.
- Test: `tests/Feature/ProvisionPmsUserTest.php`.

**luxe-pms:**
- Modify `src/lib/auth.ts` (store/read `modules`), `src/lib/nav.ts` (module tags + helper), `src/components/shell/sidebar.tsx` (filter by module), login screen (blocked reason).

---

## Task 1: PMS company_id schema + default-company backfill

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_23_000001_ensure_master_companies_table.php`
- Create: `hotel-pms-api/database/migrations/2026_06_23_000002_add_company_id_to_tenant_tables.php`
- Create: `hotel-pms-api/database/migrations/2026_06_23_000003_backfill_default_company.php`

**Interfaces:**
- Produces: nullable indexed `company_id` on `users, guests, bookings, rooms, folio_charges, folio_payments, folio_adjustments`; a `master_companies` table guaranteed to exist; a `DEFAULT-HOTEL` company row; all pre-existing rows in those tables stamped with the default company id.

- [ ] **Step 1: Guarded master_companies migration**

`...000001_ensure_master_companies_table.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('master_companies')) return; // shared hotel_pms already has it
        Schema::create('master_companies', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('code')->unique();
            $t->string('admin_email')->nullable();
            $t->string('admin_password')->nullable();
            $t->date('valid_from')->nullable();
            $t->date('valid_to')->nullable();
            $t->string('plan')->default('starter');
            $t->integer('max_branches')->default(1);
            $t->integer('max_rooms')->default(20);
            $t->integer('max_employees')->default(20);
            $t->json('modules')->nullable();
            $t->string('status')->default('active');
            $t->timestamps();
        });
    }
    public function down(): void { /* leave shared table alone */ }
};
```

- [ ] **Step 2: company_id columns migration**

`...000002_add_company_id_to_tenant_tables.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = ['users','guests','bookings','rooms','folio_charges','folio_payments','folio_adjustments'];
    public function up(): void {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && !Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, function (Blueprint $b) { $b->unsignedBigInteger('company_id')->nullable()->index(); });
            }
        }
    }
    public function down(): void {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, function (Blueprint $b) { $b->dropColumn('company_id'); });
            }
        }
    }
};
```

- [ ] **Step 3: backfill migration**

`...000003_backfill_default_company.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

return new class extends Migration {
    public function up(): void {
        $now = Carbon::now();
        $defaultId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');
        if (!$defaultId) {
            $adminHash = Schema::hasColumn('users', 'password')
                ? DB::table('users')->where('email', 'admin@hotel.com')->value('password') : null;
            $defaultId = DB::table('master_companies')->insertGetId([
                'name' => 'Default Hotel', 'code' => 'DEFAULT-HOTEL',
                'admin_email' => 'admin@hotel.com', 'admin_password' => $adminHash,
                'valid_from' => '2020-01-01', 'valid_to' => '2999-12-31', 'plan' => 'enterprise',
                'max_branches' => 99, 'max_rooms' => 9999, 'max_employees' => 9999,
                'modules' => json_encode(['front_office','hk','accounts','hrms','pos','banquets','channel_mgr']),
                'status' => 'active', 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        foreach (['users','guests','bookings','rooms','folio_charges','folio_payments','folio_adjustments'] as $t) {
            if (Schema::hasColumn($t, 'company_id')) {
                DB::table($t)->whereNull('company_id')->update(['company_id' => $defaultId]);
            }
        }
    }
    public function down(): void { /* non-destructive: leave company_id values */ }
};
```

- [ ] **Step 4: Run migrations against local hotel_pms**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan migrate`
Expected: 3 migrations run; `master_companies` skipped-create (already exists on shared DB); columns added; backfill sets company_id on existing rows.

- [ ] **Step 5: Verify**

Run: `"C:/php84/php.exe" artisan tinker --execute="echo \Illuminate\Support\Facades\Schema::hasColumn('bookings','company_id')?'yes':'no'; echo PHP_EOL; echo \Illuminate\Support\Facades\DB::table('master_companies')->where('code','DEFAULT-HOTEL')->value('id');"`
Expected: `yes` then a numeric id. Also: `"C:/php84/php.exe" artisan tinker --execute="echo \Illuminate\Support\Facades\DB::table('bookings')->whereNull('company_id')->count();"` → `0`.

- [ ] **Step 6: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add hotel-pms-api/database/migrations
git commit -m "feat(pms): add company_id to users + core tables; default-company backfill (multi-tenant slice)"
```

---

## Task 2: Tenant resolver + BelongsToCompany global scope

**Files:**
- Create: `hotel-pms-api/app/Support/Tenant.php`
- Create: `hotel-pms-api/app/Models/Concerns/BelongsToCompany.php`
- Modify: `hotel-pms-api/app/Models/{Guest,Booking,Room,FolioCharge,FolioPayment,FolioAdjustment}.php`, `app/Models/User.php`
- Test: `hotel-pms-api/tests/Feature/TenantScopeTest.php`

**Interfaces:**
- Consumes: `users.company_id` (Task 1).
- Produces: `Tenant::id(): ?int`; trait `BelongsToCompany` (global scope `company` + creating hook). Models using it are auto-scoped to `Auth::user()->company_id`.

- [ ] **Step 1: Write the failing test**

First ensure `tests/Pest.php` applies RefreshDatabase to Feature tests. If it lacks it, set its content to:
```php
<?php
use Illuminate\Foundation\Testing\RefreshDatabase;
uses(Tests\TestCase::class, RefreshDatabase::class)->in('Feature');
```

`tests/Feature/TenantScopeTest.php`:
```php
<?php
use App\Models\User;
use App\Models\Booking;

function tenantUser(int $companyId, string $email): User {
    return User::create(['name' => 'U', 'email' => $email, 'password' => 'x', 'role' => 'Owner', 'company_id' => $companyId]);
}

it('scopes queries to the acting user company and stamps inserts', function () {
    $a = tenantUser(101, 'a@a.com');
    $b = tenantUser(202, 'b@b.com');

    $this->actingAs($a);
    Booking::create(['bookingNo' => 'A1', 'guestName' => 'GA', 'status' => 'confirmed']);
    expect(Booking::count())->toBe(1);
    expect(Booking::first()->company_id)->toBe(101);

    $this->actingAs($b);
    expect(Booking::count())->toBe(0); // cannot see A's booking
    Booking::create(['bookingNo' => 'B1', 'guestName' => 'GB', 'status' => 'confirmed']);
    expect(Booking::count())->toBe(1);
    expect(Booking::first()->bookingNo)->toBe('B1');

    $this->actingAs($a);
    expect(Booking::count())->toBe(1); // still only A's
});
```
(Booking is fillable for `bookingNo,guestName,status` — confirm in `app/Models/Booking.php`; if `$fillable` is restrictive, the implementer adds these keys or uses `forceFill`. The test asserts isolation, which is the spec.)

- [ ] **Step 2: Run to verify fail**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan test --filter=TenantScopeTest`
Expected: FAIL (no scoping yet — `Booking::count()` returns both, or `company_id` not stamped).

- [ ] **Step 3: Tenant resolver**

`app/Support/Tenant.php`:
```php
<?php
namespace App\Support;
use Illuminate\Support\Facades\Auth;

class Tenant {
    public static function id(): ?int {
        $u = Auth::user();
        return $u && isset($u->company_id) ? (int) $u->company_id : null;
    }
}
```

- [ ] **Step 4: Trait**

`app/Models/Concerns/BelongsToCompany.php`:
```php
<?php
namespace App\Models\Concerns;
use App\Support\Tenant;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToCompany {
    protected static function bootBelongsToCompany(): void {
        static::addGlobalScope('company', function (Builder $b) {
            $id = Tenant::id();
            if ($id !== null) {
                $b->where($b->getModel()->getTable() . '.company_id', $id);
            }
        });
        static::creating(function ($model) {
            if (($model->company_id ?? null) === null && Tenant::id() !== null) {
                $model->company_id = Tenant::id();
            }
        });
    }
}
```

- [ ] **Step 5: Apply trait + fillable**

In each of `Guest, Booking, Room, FolioCharge, FolioPayment, FolioAdjustment`: add `use App\Models\Concerns\BelongsToCompany;` at top and `use BelongsToCompany;` inside the class body. Ensure `company_id` is mass-assignable: if the model uses `$fillable`, add `'company_id'`; if it uses `$guarded = []`, nothing needed.
In `app/Models/User.php`: add `'company_id'` to `$fillable`.

- [ ] **Step 6: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=TenantScopeTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/app/Support/Tenant.php hotel-pms-api/app/Models hotel-pms-api/tests/Feature/TenantScopeTest.php hotel-pms-api/tests/Pest.php
git commit -m "feat(pms): BelongsToCompany global scope + Tenant resolver; isolate core models"
```

---

## Task 3: PMS login validity gate + company/modules payload

**Files:**
- Create: `hotel-pms-api/app/Support/CompanyStatus.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/AuthController.php`
- Test: `hotel-pms-api/tests/Feature/LoginValidityTest.php`

**Interfaces:**
- Consumes: `users.company_id`, `master_companies` row.
- Produces: `CompanyStatus::derive(string $status, $from, $to, Carbon $now): string`; `POST /login` returns 403 `{reason}` for suspended/expired/before-valid-from; success payload gains `company` + `modules`.

- [ ] **Step 1: Write the failing test**

`tests/Feature/LoginValidityTest.php`:
```php
<?php
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

function makeCompany(array $o = []): int {
    return DB::table('master_companies')->insertGetId(array_merge([
        'name' => 'C', 'code' => 'C-'.uniqid(), 'admin_email' => 'x@x.com', 'admin_password' => 'x',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31', 'plan' => 'starter',
        'max_branches' => 1, 'max_rooms' => 10, 'max_employees' => 10,
        'modules' => json_encode(['front_office','hrms']), 'status' => 'active',
        'created_at' => now(), 'updated_at' => now(),
    ], $o));
}

it('logs in an active-company user and returns modules', function () {
    $cid = makeCompany();
    User::create(['name' => 'O', 'email' => 'o@a.com', 'password' => Hash::make('Secret@123'), 'role' => 'Owner', 'company_id' => $cid]);
    $this->postJson('/login', ['email' => 'o@a.com', 'password' => 'Secret@123'])
        ->assertOk()->assertJsonPath('modules', ['front_office','hrms']);
});

it('blocks login for an expired company', function () {
    $cid = makeCompany(['code' => 'EXP-'.uniqid(), 'valid_from' => '2025-01-01', 'valid_to' => '2026-05-31']);
    User::create(['name' => 'O', 'email' => 'e@a.com', 'password' => Hash::make('Secret@123'), 'role' => 'Owner', 'company_id' => $cid]);
    $this->postJson('/login', ['email' => 'e@a.com', 'password' => 'Secret@123'])
        ->assertStatus(403)->assertJsonPath('reason', 'expired');
});

it('blocks login for a suspended company', function () {
    $cid = makeCompany(['code' => 'SUS-'.uniqid(), 'status' => 'suspended']);
    User::create(['name' => 'O', 'email' => 's@a.com', 'password' => Hash::make('Secret@123'), 'role' => 'Owner', 'company_id' => $cid]);
    $this->postJson('/login', ['email' => 's@a.com', 'password' => 'Secret@123'])
        ->assertStatus(403)->assertJsonPath('reason', 'suspended');
});
```
NOTE: if the PMS login requires extra fields (e.g. 2FA off by default), the implementer adapts the request to the controller's real contract (read `AuthController::login`). The assertions on status/reason/modules are the spec.

- [ ] **Step 2: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=LoginValidityTest`
Expected: FAIL (no gate; no modules in payload; class CompanyStatus missing).

- [ ] **Step 3: CompanyStatus helper**

`app/Support/CompanyStatus.php`:
```php
<?php
namespace App\Support;
use Carbon\Carbon;

class CompanyStatus {
    public static function derive(string $status, $validFrom, $validTo, Carbon $now): string {
        if ($status === 'suspended') return 'suspended';
        if ($validFrom === null || $validTo === null) return 'active';
        $from = Carbon::parse($validFrom)->startOfDay();
        $to = Carbon::parse($validTo)->endOfDay();
        if ($now->lt($from)) return 'pending';
        if ($now->gt($to)) return 'expired';
        if ($now->diffInDays($to, false) <= 30) return 'expiring';
        return 'active';
    }
}
```

- [ ] **Step 4: Add the gate + payload to AuthController**

Read `app/Http/Controllers/Api/AuthController.php`. In `login()`, AFTER the password is verified and BEFORE the token is created, insert:
```php
$company = $user->company_id ? \Illuminate\Support\Facades\DB::table('master_companies')->where('id', $user->company_id)->first() : null;
if ($company) {
    $status = \App\Support\CompanyStatus::derive($company->status ?? 'active', $company->valid_from, $company->valid_to, now());
    if (in_array($status, ['suspended', 'expired', 'pending'], true)) {
        return response()->json(['message' => 'Account access is blocked.', 'reason' => $status === 'pending' ? 'before_valid_from' : $status], 403);
    }
}
```
Then in the success payload (the `userPayload()` method or the login return array), add:
```php
'company' => $company ? ['id' => $company->id, 'name' => $company->name, 'code' => $company->code] : null,
'modules' => $company && $company->modules ? (is_array($company->modules) ? $company->modules : json_decode($company->modules, true)) : [],
```
If `userPayload()` doesn't have `$company` in scope, fetch it there from `$user->company_id` the same way, or pass it in. Make `/login` and `/me` both include `company` + `modules` (so a page refresh keeps the modules). For `/me`, derive `$company` from `$request->user()->company_id`.

- [ ] **Step 5: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=LoginValidityTest`
Expected: PASS (3).

- [ ] **Step 6: Full PMS suite (no regressions)**

Run: `"C:/php84/php.exe" artisan test`
Expected: all green (pre-existing tests + the 2 new files). If a pre-existing auth test breaks because it lacks a company, it's acceptable for the user to have `company_id = null` → gate is skipped (no company row) → login proceeds. Confirm such tests still pass; if one asserts the payload shape, add `company`/`modules` keys are additive (non-breaking).

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/app/Support/CompanyStatus.php hotel-pms-api/app/Http/Controllers/Api/AuthController.php hotel-pms-api/tests/Feature/LoginValidityTest.php
git commit -m "feat(pms): block login for expired/suspended company; return company+modules"
```

---

## Task 4: masterhotel provisions a PMS Owner login on company create

**Files:**
- Modify: `masterhotel-api/app/Http/Controllers/CompanyController.php`
- Test: `masterhotel-api/tests/Feature/ProvisionPmsUserTest.php`

**Interfaces:**
- Consumes: `master_companies` row (after store), shared `users` table.
- Produces: on company create, a `users` row `{email: admin_email, password: <same bcrypt hash>, role: 'Owner', status: 'active', company_id: <new id>}`; on resetPassword, that row's password is updated.

- [ ] **Step 1: Write the failing test**

`tests/Feature/ProvisionPmsUserTest.php`:
```php
<?php
use App\Models\SuperAdmin;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    // masterhotel's sqlite test DB has no users table (PMS owns it) — create a minimal one for the assertion.
    if (!Schema::hasTable('users')) {
        Schema::create('users', function ($t) {
            $t->id(); $t->string('name'); $t->string('email')->unique(); $t->string('password');
            $t->string('role')->nullable(); $t->string('status')->nullable();
            $t->unsignedBigInteger('company_id')->nullable(); $t->timestamps();
        });
    }
    $this->admin = SuperAdmin::updateOrCreate(['email' => 'm@akilgroup.com'], ['name' => 'SA', 'password' => 'x', 'is_active' => true]);
});

it('provisions a PMS Owner user when a company is created', function () {
    $payload = [
        'name' => 'Acme Hotels', 'code' => 'ACME-1', 'admin_email' => 'owner@acme.com',
        'admin_password' => 'Secret@123', 'admin_password_confirmation' => 'Secret@123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31', 'plan' => 'professional',
        'max_branches' => 2, 'max_rooms' => 30, 'max_employees' => 30, 'modules' => ['front_office'],
    ];
    $this->actingAs($this->admin, 'sanctum')->postJson('/api/companies', $payload)->assertCreated();

    $u = DB::table('users')->where('email', 'owner@acme.com')->first();
    expect($u)->not->toBeNull();
    expect($u->role)->toBe('Owner');
    expect((int) $u->company_id)->toBe((int) \App\Models\MasterCompany::where('code', 'ACME-1')->value('id'));
    expect(\Illuminate\Support\Facades\Hash::check('Secret@123', $u->password))->toBeTrue();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd masterhotel-api && "C:/php84/php.exe" artisan test --filter=ProvisionPmsUserTest`
Expected: FAIL (no users row created by store).

- [ ] **Step 3: Add provisioning to CompanyController**

Add a private helper and call it from `store()` and `resetPassword()`. Add `use Illuminate\Support\Facades\DB;` and `use Illuminate\Support\Facades\Schema;` at top.
```php
    private function syncPmsUser(MasterCompany $c): void {
        if (!Schema::hasTable('users')) return; // safety; shared hotel_pms always has it
        $now = now();
        $existing = DB::table('users')->where('email', $c->admin_email)->first();
        if ($existing) {
            DB::table('users')->where('id', $existing->id)->update([
                'password' => $c->admin_password, 'company_id' => $c->id, 'role' => 'Owner', 'status' => 'active', 'updated_at' => $now,
            ]);
        } else {
            DB::table('users')->insert([
                'name' => $c->name . ' Owner', 'email' => $c->admin_email, 'password' => $c->admin_password,
                'role' => 'Owner', 'status' => 'active', 'company_id' => $c->id, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }
```
In `store()`, after `AuditLogger::log(...)` and before the return, add: `$this->syncPmsUser($c);`
In `resetPassword()`, after `$company->update([...])`, add: `$this->syncPmsUser($company->fresh());`
(`$c->admin_password` is the bcrypt hash from the model's `hashed` cast — copying it makes the PMS login accept the same plaintext password.)

- [ ] **Step 4: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=ProvisionPmsUserTest`
Expected: PASS.

- [ ] **Step 5: Full masterhotel suite + commit**

Run: `"C:/php84/php.exe" artisan test` → all green.
```bash
cd "d:/masterhotel/masterhotel-api"
git add app/Http/Controllers/CompanyController.php tests/Feature/ProvisionPmsUserTest.php
git commit -m "feat: provision PMS Owner user (company_id) when a company is created/reset"
```
(Note: masterhotel-api is its own git repo at D:\masterhotel.)

---

## Task 5: luxe-pms — store modules, gate nav, show blocked reason

**Files:**
- Modify: `luxe-pms/src/lib/auth.ts`, `luxe-pms/src/lib/nav.ts`, `luxe-pms/src/components/shell/sidebar.tsx`, the login screen component.

**Interfaces:**
- Consumes: `/login` + `/me` now return `modules: string[]`.
- Produces: nav items hidden when their `module` isn't in the tenant's modules; login screen shows the 403 `reason`.

- [ ] **Step 1: Persist modules from auth responses**

In `src/lib/auth.ts`: add a `MODULES_KEY = "pms_modules"`. Where the login/`me` response is handled and `pms_pages`/`pms_role_name` are stored, also store modules: `localStorage.setItem(MODULES_KEY, JSON.stringify(data.modules ?? []))`. Add `export function getModules(): string[] { try { return JSON.parse(localStorage.getItem(MODULES_KEY) || "[]"); } catch { return []; } }`. (If a module list is empty, treat as "all allowed" so the default company / legacy users are unaffected — see Step 3.)

- [ ] **Step 2: Tag nav items with a module + helper**

In `src/lib/nav.ts`: add an optional `module?: string` to the nav item type, and tag the module-specific items, e.g.:
```ts
// examples — set module on items that belong to a licensable module
{ href: "/accounts", label: "Accounts", icon: Wallet, group: "billing", roles: MANAGER, module: "accounts" },
{ href: "/pos", label: "POS", icon: ..., group: "...", module: "pos" },
{ href: "/banquets", label: "Banquets", icon: ..., group: "...", module: "banquets" },
{ href: "/channel-manager", label: "Channel Manager", icon: ..., group: "...", module: "channel_mgr" },
// HR/HRMS pages -> module: "hrms"; housekeeping pages -> module: "hk"; front-desk/bookings -> module: "front_office"
```
Add a helper: `export function moduleAllowed(item: NavItem, modules: string[]): boolean { return !item.module || modules.length === 0 || modules.includes(item.module); }` (empty modules = allow all, for backward compatibility).

- [ ] **Step 3: Filter the sidebar by module**

In `src/components/shell/sidebar.tsx`, import `getModules` and `moduleAllowed`; compute `const modules = getModules();` and extend the existing filter (currently `rolesFor(item).includes(role) && canAccessPage(item.href)`) with `&& moduleAllowed(item, modules)`.

- [ ] **Step 4: Show the blocked reason on login**

In the login screen component, when the login request returns 403, read `reason` from the response body and show a friendly message:
```ts
// map reason -> message
const MSG: Record<string,string> = {
  expired: "Your licence has expired. Please contact your provider to renew.",
  suspended: "Your account has been suspended. Please contact your provider.",
  before_valid_from: "Your licence is not active yet. Please contact your provider.",
};
// on 403: setError(MSG[body.reason] ?? "Access blocked.")
```

- [ ] **Step 5: Build**

Run: `cd luxe-pms && npm run build`
Expected: build passes. (This app may have its own lint/build quirks — fix only genuine type errors introduced by these edits.)

- [ ] **Step 6: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add luxe-pms/src/lib/auth.ts luxe-pms/src/lib/nav.ts luxe-pms/src/components/shell/sidebar.tsx luxe-pms/src/app
git commit -m "feat(pms-ui): hide unlicensed module nav; show licence-blocked message on login"
```

---

## Task 6: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Backend suites green**

Run (PMS): `cd hotel-pms-api && "C:/php84/php.exe" artisan test` → green.
Run (masterhotel): `cd /d/masterhotel/masterhotel-api && "C:/php84/php.exe" artisan test` → green.

- [ ] **Step 2: Provision two tenants via masterhotel API (live)**

With masterhotel API on :8001, mint a super-admin token and create two companies with different modules (Company A: all modules incl accounts; Company B: only front_office). Use the masterhotel UI (http://localhost:3100/companies → New Company) or curl. Record A's and B's admin emails/passwords.

- [ ] **Step 3: Tenant isolation (the core proof)**

Start the PMS API on :8000 (`cd hotel-pms-api && "C:/php84/php.exe" artisan serve --port=8000`).
- `POST :8000/login` as A's Owner → 200, capture token. `GET :8000/api/bookings` (or the bookings list route) → only A's rows. Create a booking. Confirm it persists with A's company_id (tinker: `DB::table('bookings')->latest('id')->first()->company_id`).
- `POST :8000/login` as B's Owner → 200. List bookings → **A's booking is NOT present**. Create B's booking.
- Re-login as A → A still sees only its own booking.

- [ ] **Step 4: Validity gate**

In masterhotel, set Company A `valid_to` to yesterday (or Suspend). `POST :8000/login` as A → **403** with `reason: expired` (or `suspended`). Reactivate → login works again.

- [ ] **Step 5: Module gating**

Log into luxe-pms (http://localhost:3000 or its dev port) as B (front_office only) → the **Accounts/POS/etc. nav items are hidden**. As A (all modules) → they appear.

- [ ] **Step 6: Realm separation**

`POST :8000/login` with `master@akilgroup.com` / `Master@2026` → fails (not a PMS user). In masterhotel (`:3100/login`), try a tenant Owner's email/password → fails (not a super_admin).

- [ ] **Step 7: Existing hotel intact**

`POST :8000/login` as `admin@hotel.com` (default company) → works; existing data visible (scoped to DEFAULT-HOTEL). 

- [ ] **Step 8: Final commit/tag**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source" && git add -A && git commit -m "chore(pms): multi-tenant slice verified end-to-end" --allow-empty
```

---

## Self-Review notes

- **Spec coverage:** credential realms ✓ (Tasks 3,4 + T6 S6), company_id model + default backfill ✓ (T1), provisioning ✓ (T4), login gate ✓ (T3), global-scope isolation ✓ (T2), module gating ✓ (T5), end-to-end test ✓ (T6). Backend per-endpoint module enforcement intentionally deferred (spec §8/§12).
- **Cross-DB safety:** every cross-table access (`master_companies`, `users`) is guarded with `Schema::hasTable`/`hasColumn`; company_id columns carry no DB-level FK; sqlite tests create the tables they assert on. No migration mutates an existing column.
- **Naming consistency:** `company_id`, `Tenant::id()`, `CompanyStatus::derive`, `BelongsToCompany`, module keys, `DEFAULT-HOTEL`, reasons `suspended|expired|before_valid_from` — identical across PMS, masterhotel, and frontend tasks.
- **No-auth safety:** global scope is a no-op when unauthenticated, so seeders/migrations/console and the existing `admin@hotel.com` (post-backfill) behave correctly.
