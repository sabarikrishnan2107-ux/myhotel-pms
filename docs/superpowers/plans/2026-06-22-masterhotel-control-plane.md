# masterhotel Control Plane — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone super-admin "Company Master" control plane (Laravel API + Next.js panel) that onboards client hotel companies with issued logins, licence validity windows, plan limits, and branches — running locally against a copy of the live `hotel_pms` database.

**Architecture:** Two apps in `D:\masterhotel\` mirroring the existing repo: a Laravel 13 API (`masterhotel-api`) with Sanctum token auth, and a Next.js 16 panel (`masterhotel-web`) reusing the navy-gold theme from `hrms-master-sample.html`. Master tables are additive and namespaced (`super_admins`, `master_companies`, `master_branches`, `master_audit_logs`) inside the existing `hotel_pms` Postgres DB so nothing existing is touched.

**Tech Stack:** Laravel 13 / PHP 8.3 / PostgreSQL 16 / Laravel Sanctum / Pest (or PHPUnit) · Next.js 16 / React 19 / TypeScript / plain CSS.

## Global Constraints

- PHP `^8.3`; use `C:\php84\php.exe` to run artisan locally (herd-lite php lacks pgsql). PHP 8.4.0 is installed there.
- Composer: invoke as `"C:/php84/php.exe" "C:/Users/sabar/.config/herd/bin/composer.phar"` (Composer 2.9.5; not on PATH).
- Node 24.13 / npm 11 / npx are on PATH. Local `hotel_pms` reachable at 127.0.0.1:5432 (postgres/sabari12345), verified.
- Use the Bash tool (Git Bash) for POSIX commands; paths under `D:\masterhotel` = `/d/masterhotel` in Bash.
- Database connection (local dev): `pgsql`, host `127.0.0.1`, port `5432`, db `hotel_pms`, user `postgres`, pass `sabari12345`.
- All master tables are **additive** and **prefixed** (`super_admins`, `master_*`) — never modify or drop existing PMS tables.
- Super-admin seed: `master@akilgroup.com` / `Master@2026`, `force_password_change = true`.
- Company `code` is the unique company id (e.g. `GPR-001`).
- Status derivation: `suspended` (manual) > `expired` (`today > valid_to`) > `expiring` (`valid_to` ≤ 30 days away) > `active`.
- Limits enforced **server-side**: sum of branch `rooms_count` ≤ `max_rooms`, sum of `employees_count` ≤ `max_employees`, branch count ≤ `max_branches`.
- Frontend API base via `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api`).
- TDD: write the failing test first, watch it fail, implement minimally, watch it pass, commit.

---

## File Structure

**masterhotel-api (Laravel):**
- `app/Models/SuperAdmin.php`, `MasterCompany.php`, `MasterBranch.php`, `MasterAuditLog.php`
- `database/migrations/*_create_super_admins_table.php`, `*_create_master_companies_table.php`, `*_create_master_branches_table.php`, `*_create_master_audit_logs_table.php`
- `app/Http/Controllers/AuthController.php`, `CompanyController.php`, `BranchController.php`, `DashboardController.php`, `AuditLogController.php`, `TenantAuthController.php`
- `app/Http/Requests/StoreCompanyRequest.php`, `UpdateCompanyRequest.php`, `StoreBranchRequest.php`
- `app/Support/CompanyStatus.php` (status derivation helper)
- `app/Support/AuditLogger.php` (writes audit rows)
- `routes/api.php`
- `database/seeders/MasterSeeder.php`
- `tests/Feature/AuthTest.php`, `CompanyTest.php`, `BranchTest.php`, `DashboardTest.php`, `TenantAuthTest.php`

**masterhotel-web (Next.js):**
- `app/login/page.tsx`, `app/dashboard/page.tsx`, `app/companies/page.tsx`, `app/companies/[id]/page.tsx`
- `app/globals.css` (ported theme), `lib/api.ts` (fetch client + token), `lib/auth.ts` (guard)
- `components/CompanyDrawer.tsx`, `components/StatCard.tsx`, `components/StatusBadge.tsx`, `components/BranchTable.tsx`

---

## Task 1: Scaffold the Laravel API

**Files:**
- Create: `D:\masterhotel\masterhotel-api\` (fresh Laravel app)
- Modify: `masterhotel-api/.env`

- [ ] **Step 1: Create the folder and Laravel app**

```bash
mkdir -p /d/masterhotel
cd /d/masterhotel
"C:/php84/php.exe" "C:/ProgramData/ComposerSetup/bin/composer.phar" create-project laravel/laravel masterhotel-api
```
(If `composer` is on PATH, `composer create-project laravel/laravel masterhotel-api` is fine.)

- [ ] **Step 2: Configure the database connection**

Edit `masterhotel-api/.env` — set:
```
APP_NAME=masterhotel
APP_URL=http://localhost:8000
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=hotel_pms
DB_USERNAME=postgres
DB_PASSWORD=sabari12345
```

- [ ] **Step 3: Install Sanctum**

```bash
cd /d/masterhotel/masterhotel-api
"C:/php84/php.exe" artisan install:api
```
Expected: creates `routes/api.php`, publishes Sanctum, adds `personal_access_tokens` migration. (This table already exists in `hotel_pms` — if migrate later complains, mark that one migration as already run or skip it; it is shared and harmless.)

- [ ] **Step 4: Verify the app boots**

Run: `"C:/php84/php.exe" artisan about`
Expected: prints environment table with `pgsql` connection, no errors.

- [ ] **Step 5: Commit**

```bash
cd /d/masterhotel/masterhotel-api && git init && git add -A
git commit -m "chore: scaffold masterhotel-api (Laravel 13 + Sanctum, hotel_pms pgsql)"
```

---

## Task 2: Migrations for the master tables

**Files:**
- Create: `database/migrations/2026_06_22_000001_create_super_admins_table.php`
- Create: `database/migrations/2026_06_22_000002_create_master_companies_table.php`
- Create: `database/migrations/2026_06_22_000003_create_master_branches_table.php`
- Create: `database/migrations/2026_06_22_000004_create_master_audit_logs_table.php`

**Interfaces:**
- Produces: tables `super_admins`, `master_companies`, `master_branches`, `master_audit_logs` with the columns below; later models/controllers rely on these exact column names.

- [ ] **Step 0: Delete the colliding default scaffold migrations**

The scaffold ships 4 default migrations whose tables ALREADY EXIST in the shared `hotel_pms` (`users`, `cache`/`cache_locks`, `jobs`/`job_batches`/`failed_jobs`, `personal_access_tokens` — all verified present). masterhotel must NOT manage them. Delete these files so only the master migrations run:
```bash
cd /d/masterhotel/masterhotel-api
rm -f database/migrations/0001_01_01_000000_create_users_table.php \
      database/migrations/0001_01_01_000001_create_cache_table.php \
      database/migrations/0001_01_01_000002_create_jobs_table.php \
      database/migrations/*_create_personal_access_tokens_table.php
ls database/migrations/   # should show ONLY the 4 master migrations you create below
```

- [ ] **Step 1: Write the super_admins migration**

`database/migrations/2026_06_22_000001_create_super_admins_table.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('super_admins', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('email')->unique();
            $t->string('password');
            $t->boolean('is_active')->default(true);
            $t->boolean('force_password_change')->default(true);
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('super_admins'); }
};
```

- [ ] **Step 2: Write the master_companies migration**

`database/migrations/2026_06_22_000002_create_master_companies_table.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('master_companies', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('code')->unique();
            $t->string('logo_path')->nullable();
            $t->string('gst_no')->nullable();
            $t->string('contact_email')->nullable();
            $t->string('contact_phone')->nullable();
            $t->text('address')->nullable();
            $t->string('admin_email')->unique();
            $t->string('admin_password');
            $t->boolean('force_password_change')->default(true);
            $t->date('valid_from');
            $t->date('valid_to');
            $t->string('plan')->default('starter');
            $t->integer('max_branches')->default(1);
            $t->integer('max_rooms')->default(20);
            $t->integer('max_employees')->default(20);
            $t->jsonb('modules')->nullable();
            $t->string('status')->default('active'); // active | suspended
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('master_companies'); }
};
```

- [ ] **Step 3: Write the master_branches migration**

`database/migrations/2026_06_22_000003_create_master_branches_table.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('master_branches', function (Blueprint $t) {
            $t->id();
            $t->foreignId('company_id')->constrained('master_companies')->cascadeOnDelete();
            $t->string('name');
            $t->string('code');
            $t->string('city')->nullable();
            $t->text('address')->nullable();
            $t->integer('rooms_count')->default(0);
            $t->integer('employees_count')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->unique(['company_id', 'code']);
        });
    }
    public function down(): void { Schema::dropIfExists('master_branches'); }
};
```

- [ ] **Step 4: Write the master_audit_logs migration**

`database/migrations/2026_06_22_000004_create_master_audit_logs_table.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('master_audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('super_admin_id')->nullable();
            $t->string('action');
            $t->string('entity');
            $t->unsignedBigInteger('entity_id')->nullable();
            $t->jsonb('meta')->nullable();
            $t->timestamp('created_at')->useCurrent();
        });
    }
    public function down(): void { Schema::dropIfExists('master_audit_logs'); }
};
```

- [ ] **Step 5: Run the migrations**

Run: `"C:/php84/php.exe" artisan migrate`
Expected: 4 master tables created, "DONE". (If it tries to re-run `personal_access_tokens`/`users` and errors because they already exist in `hotel_pms`, delete those scaffold migration files — the shared tables already exist — then re-run.)

- [ ] **Step 6: Verify tables exist**

Run: `"C:/php84/php.exe" artisan tinker --execute="echo implode(',', \Illuminate\Support\Facades\Schema::getColumnListing('master_companies'));"`
Expected: prints the company columns including `valid_from,valid_to,max_rooms,modules,status`.

- [ ] **Step 7: Commit**

```bash
git add database/migrations && git commit -m "feat: additive master tables (super_admins, master_companies/branches/audit_logs)"
```

---

## Task 3: Eloquent models

**Files:**
- Create: `app/Models/SuperAdmin.php`, `MasterCompany.php`, `MasterBranch.php`, `MasterAuditLog.php`

**Interfaces:**
- Produces: `MasterCompany` with `branches()` hasMany, `modules` array cast, `admin_password`/`password` hashed cast; `MasterBranch` with `company()` belongsTo; `SuperAdmin` extends Authenticatable with Sanctum `HasApiTokens`.

- [ ] **Step 1: Write SuperAdmin model**

`app/Models/SuperAdmin.php`:
```php
<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class SuperAdmin extends Authenticatable {
    use HasApiTokens;
    protected $fillable = ['name', 'email', 'password', 'is_active', 'force_password_change'];
    protected $hidden = ['password'];
    protected $casts = ['password' => 'hashed', 'is_active' => 'boolean', 'force_password_change' => 'boolean'];
}
```

- [ ] **Step 2: Write MasterCompany model**

`app/Models/MasterCompany.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class MasterCompany extends Model {
    protected $fillable = [
        'name','code','logo_path','gst_no','contact_email','contact_phone','address',
        'admin_email','admin_password','force_password_change',
        'valid_from','valid_to','plan','max_branches','max_rooms','max_employees','modules','status',
    ];
    protected $hidden = ['admin_password'];
    protected $casts = [
        'admin_password' => 'hashed',
        'force_password_change' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
        'modules' => 'array',
    ];
    public function branches() { return $this->hasMany(MasterBranch::class, 'company_id'); }
}
```

- [ ] **Step 3: Write MasterBranch and MasterAuditLog models**

`app/Models/MasterBranch.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class MasterBranch extends Model {
    protected $fillable = ['company_id','name','code','city','address','rooms_count','employees_count','is_active'];
    protected $casts = ['is_active' => 'boolean'];
    public function company() { return $this->belongsTo(MasterCompany::class, 'company_id'); }
}
```

`app/Models/MasterAuditLog.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class MasterAuditLog extends Model {
    public $timestamps = false;
    protected $fillable = ['super_admin_id','action','entity','entity_id','meta'];
    protected $casts = ['meta' => 'array'];
}
```

- [ ] **Step 4: Smoke-test the models in tinker**

Run: `"C:/php84/php.exe" artisan tinker --execute="echo App\Models\MasterCompany::count();"`
Expected: prints `0` with no error (models load, casts valid).

- [ ] **Step 5: Commit**

```bash
git add app/Models && git commit -m "feat: master models with casts and relationships"
```

---

## Task 4: Status derivation helper

**Files:**
- Create: `app/Support/CompanyStatus.php`
- Test: `tests/Unit/CompanyStatusTest.php`

**Interfaces:**
- Produces: `CompanyStatus::derive(string $status, $validFrom, $validTo, \Carbon\Carbon $now): string` returning `suspended|expired|expiring|active|pending`.

- [ ] **Step 1: Write the failing test**

`tests/Unit/CompanyStatusTest.php`:
```php
<?php
use App\Support\CompanyStatus;
use Carbon\Carbon;

it('returns suspended when manually suspended', function () {
    $now = Carbon::parse('2026-06-22');
    expect(CompanyStatus::derive('suspended', '2026-01-01', '2026-12-31', $now))->toBe('suspended');
});
it('returns expired when past valid_to', function () {
    $now = Carbon::parse('2026-06-22');
    expect(CompanyStatus::derive('active', '2025-01-01', '2026-05-31', $now))->toBe('expired');
});
it('returns expiring within 30 days', function () {
    $now = Carbon::parse('2026-06-22');
    expect(CompanyStatus::derive('active', '2026-01-01', '2026-07-10', $now))->toBe('expiring');
});
it('returns active otherwise', function () {
    $now = Carbon::parse('2026-06-22');
    expect(CompanyStatus::derive('active', '2026-01-01', '2026-12-31', $now))->toBe('active');
});
it('returns pending before valid_from', function () {
    $now = Carbon::parse('2026-06-22');
    expect(CompanyStatus::derive('active', '2026-08-01', '2027-08-01', $now))->toBe('pending');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:/php84/php.exe" artisan test --filter=CompanyStatusTest`
Expected: FAIL — class `App\Support\CompanyStatus` not found.

- [ ] **Step 3: Write the helper**

`app/Support/CompanyStatus.php`:
```php
<?php
namespace App\Support;
use Carbon\Carbon;

class CompanyStatus {
    public static function derive(string $status, $validFrom, $validTo, Carbon $now): string {
        if ($status === 'suspended') return 'suspended';
        $from = Carbon::parse($validFrom)->startOfDay();
        $to = Carbon::parse($validTo)->endOfDay();
        if ($now->lt($from)) return 'pending';
        if ($now->gt($to)) return 'expired';
        if ($now->diffInDays($to, false) <= 30) return 'expiring';
        return 'active';
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `"C:/php84/php.exe" artisan test --filter=CompanyStatusTest`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add app/Support/CompanyStatus.php tests/Unit/CompanyStatusTest.php
git commit -m "feat: company status derivation helper with tests"
```

---

## Task 5: Audit logger helper

**Files:**
- Create: `app/Support/AuditLogger.php`

**Interfaces:**
- Produces: `AuditLogger::log(?int $superAdminId, string $action, string $entity, ?int $entityId, array $meta = []): void`

- [ ] **Step 1: Write the helper**

`app/Support/AuditLogger.php`:
```php
<?php
namespace App\Support;
use App\Models\MasterAuditLog;

class AuditLogger {
    public static function log(?int $superAdminId, string $action, string $entity, ?int $entityId, array $meta = []): void {
        MasterAuditLog::create([
            'super_admin_id' => $superAdminId,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'meta' => $meta ?: null,
        ]);
    }
}
```

- [ ] **Step 2: Smoke-test**

Run: `"C:/php84/php.exe" artisan tinker --execute="App\Support\AuditLogger::log(null,'test','company',1,['x'=>1]); echo App\Models\MasterAuditLog::count();"`
Expected: prints `1`.

- [ ] **Step 3: Clean up the test row + commit**

Run: `"C:/php84/php.exe" artisan tinker --execute="App\Models\MasterAuditLog::truncate();"`
```bash
git add app/Support/AuditLogger.php && git commit -m "feat: audit logger helper"
```

---

## Task 6: Super-admin authentication

**Files:**
- Create: `app/Http/Controllers/AuthController.php`
- Modify: `routes/api.php`
- Create: `database/seeders/MasterSeeder.php` (super-admin only for now)
- Test: `tests/Feature/AuthTest.php`

**Interfaces:**
- Consumes: `SuperAdmin` model.
- Produces: routes `POST /api/auth/login` → `{token, super_admin}`, `POST /api/auth/logout`, `GET /api/auth/me`; auth guard `auth:sanctum`.

- [ ] **Step 1: Seed a super-admin for tests**

`database/seeders/MasterSeeder.php`:
```php
<?php
namespace Database\Seeders;
use App\Models\SuperAdmin;
use Illuminate\Database\Seeder;

class MasterSeeder extends Seeder {
    public function run(): void {
        SuperAdmin::updateOrCreate(
            ['email' => 'master@akilgroup.com'],
            ['name' => 'Super Admin', 'password' => 'Master@2026', 'is_active' => true, 'force_password_change' => true]
        );
    }
}
```
Run: `"C:/php84/php.exe" artisan db:seed --class=MasterSeeder`
Expected: super-admin row created.

- [ ] **Step 2: Write the failing test**

`tests/Feature/AuthTest.php`:
```php
<?php
use App\Models\SuperAdmin;

beforeEach(fn () => SuperAdmin::updateOrCreate(
    ['email' => 'master@akilgroup.com'],
    ['name' => 'Super Admin', 'password' => 'Master@2026', 'is_active' => true]
));

it('logs in a super admin with valid credentials', function () {
    $this->postJson('/api/auth/login', ['email' => 'master@akilgroup.com', 'password' => 'Master@2026'])
        ->assertOk()->assertJsonStructure(['token', 'super_admin' => ['id', 'email']]);
});
it('rejects bad credentials', function () {
    $this->postJson('/api/auth/login', ['email' => 'master@akilgroup.com', 'password' => 'wrong'])
        ->assertStatus(422);
});
it('returns the current super admin', function () {
    $admin = SuperAdmin::where('email', 'master@akilgroup.com')->first();
    $this->actingAs($admin, 'sanctum')->getJson('/api/auth/me')->assertOk()->assertJsonPath('email', 'master@akilgroup.com');
});
```

- [ ] **Step 2b: Run test to verify it fails**

Run: `"C:/php84/php.exe" artisan test --filter=AuthTest`
Expected: FAIL — route `/api/auth/login` not defined (404).

- [ ] **Step 3: Write the controller**

`app/Http/Controllers/AuthController.php`:
```php
<?php
namespace App\Http\Controllers;
use App\Models\SuperAdmin;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller {
    public function login(Request $r) {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $admin = SuperAdmin::where('email', $data['email'])->where('is_active', true)->first();
        if (!$admin || !\Hash::check($data['password'], $admin->password)) {
            throw ValidationException::withMessages(['email' => ['Invalid credentials.']]);
        }
        return ['token' => $admin->createToken('master')->plainTextToken, 'super_admin' => $admin];
    }
    public function logout(Request $r) { $r->user()->currentAccessToken()->delete(); return ['ok' => true]; }
    public function me(Request $r) { return $r->user(); }
}
```

- [ ] **Step 4: Wire routes**

In `routes/api.php` add:
```php
use App\Http\Controllers\AuthController;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `"C:/php84/php.exe" artisan test --filter=AuthTest`
Expected: PASS (3 passed).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/AuthController.php routes/api.php database/seeders/MasterSeeder.php tests/Feature/AuthTest.php
git commit -m "feat: super-admin auth (login/logout/me) with Sanctum + tests"
```

---

## Task 7: Companies — list & create

**Files:**
- Create: `app/Http/Controllers/CompanyController.php`
- Create: `app/Http/Requests/StoreCompanyRequest.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/CompanyTest.php`

**Interfaces:**
- Consumes: `MasterCompany`, `CompanyStatus::derive`, `AuditLogger::log`.
- Produces: `GET /api/companies` (list with `effective_status`, `branches_count`), `POST /api/companies` (create). Each company JSON includes computed `effective_status`.

- [ ] **Step 1: Write the failing test**

`tests/Feature/CompanyTest.php`:
```php
<?php
use App\Models\SuperAdmin;
use App\Models\MasterCompany;

beforeEach(function () {
    $this->admin = SuperAdmin::updateOrCreate(['email' => 'm@akilgroup.com'],
        ['name' => 'SA', 'password' => 'x', 'is_active' => true]);
});

it('lists companies with effective status', function () {
    MasterCompany::create([
        'name' => 'Grand Palace', 'code' => 'GPR-001', 'admin_email' => 'a@gp.com', 'admin_password' => 'secret123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31', 'plan' => 'enterprise',
        'max_branches' => 5, 'max_rooms' => 100, 'max_employees' => 200, 'modules' => ['hrms'],
    ]);
    $this->actingAs($this->admin, 'sanctum')->getJson('/api/companies')
        ->assertOk()->assertJsonPath('data.0.code', 'GPR-001')
        ->assertJsonPath('data.0.effective_status', 'active');
});

it('creates a company', function () {
    $payload = [
        'name' => 'Seabreeze', 'code' => 'SBH-014', 'admin_email' => 'it@sb.in',
        'admin_password' => 'Secret@123', 'admin_password_confirmation' => 'Secret@123',
        'valid_from' => '2026-03-15', 'valid_to' => '2026-07-14', 'plan' => 'professional',
        'max_branches' => 3, 'max_rooms' => 40, 'max_employees' => 40, 'modules' => ['front_office','hrms'],
    ];
    $this->actingAs($this->admin, 'sanctum')->postJson('/api/companies', $payload)
        ->assertCreated()->assertJsonPath('data.code', 'SBH-014');
    expect(MasterCompany::where('code', 'SBH-014')->exists())->toBeTrue();
});

it('rejects duplicate code', function () {
    MasterCompany::create(['name' => 'X', 'code' => 'DUP-1', 'admin_email' => 'x@x.com', 'admin_password' => 'secret123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31']);
    $this->actingAs($this->admin, 'sanctum')->postJson('/api/companies', [
        'name' => 'Y', 'code' => 'DUP-1', 'admin_email' => 'y@y.com',
        'admin_password' => 'Secret@123', 'admin_password_confirmation' => 'Secret@123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31',
    ])->assertStatus(422)->assertJsonValidationErrors('code');
});

it('rejects valid_to before valid_from', function () {
    $this->actingAs($this->admin, 'sanctum')->postJson('/api/companies', [
        'name' => 'Z', 'code' => 'Z-1', 'admin_email' => 'z@z.com',
        'admin_password' => 'Secret@123', 'admin_password_confirmation' => 'Secret@123',
        'valid_from' => '2026-12-31', 'valid_to' => '2026-01-01',
    ])->assertStatus(422)->assertJsonValidationErrors('valid_to');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `"C:/php84/php.exe" artisan test --filter=CompanyTest`
Expected: FAIL — 404 / route not defined.

- [ ] **Step 3: Write the FormRequest**

`app/Http/Requests/StoreCompanyRequest.php`:
```php
<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;

class StoreCompanyRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:master_companies,code',
            'logo_path' => 'nullable|string',
            'gst_no' => 'nullable|string|max:50',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:40',
            'address' => 'nullable|string',
            'admin_email' => 'required|email|unique:master_companies,admin_email',
            'admin_password' => 'required|string|min:8|confirmed',
            'valid_from' => 'required|date',
            'valid_to' => 'required|date|after:valid_from',
            'plan' => 'required|in:starter,professional,enterprise',
            'max_branches' => 'required|integer|min:1',
            'max_rooms' => 'required|integer|min:1',
            'max_employees' => 'required|integer|min:1',
            'modules' => 'array',
        ];
    }
}
```

- [ ] **Step 4: Write the controller (index + store)**

`app/Http/Controllers/CompanyController.php`:
```php
<?php
namespace App\Http\Controllers;
use App\Http\Requests\StoreCompanyRequest;
use App\Models\MasterCompany;
use App\Support\AuditLogger;
use App\Support\CompanyStatus;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CompanyController extends Controller {
    private function decorate(MasterCompany $c): array {
        $arr = $c->toArray();
        $arr['effective_status'] = CompanyStatus::derive($c->status, $c->valid_from, $c->valid_to, Carbon::now());
        $arr['branches_count'] = $c->branches()->count();
        return $arr;
    }

    public function index(Request $r) {
        $q = MasterCompany::query();
        if ($s = $r->query('search')) {
            $q->where(fn ($w) => $w->where('name', 'ilike', "%$s%")->orWhere('code', 'ilike', "%$s%")->orWhere('admin_email', 'ilike', "%$s%"));
        }
        $rows = $q->orderBy('name')->get()->map(fn ($c) => $this->decorate($c));
        if ($status = $r->query('status')) {
            $rows = $rows->where('effective_status', $status)->values();
        }
        return ['data' => $rows];
    }

    public function store(StoreCompanyRequest $r) {
        $c = MasterCompany::create($r->validated());
        AuditLogger::log($r->user()?->id, 'created', 'company', $c->id, ['code' => $c->code]);
        return response()->json(['data' => $this->decorate($c)], 201);
    }
}
```

- [ ] **Step 5: Wire routes**

In `routes/api.php`, inside the `auth:sanctum` group add:
```php
use App\Http\Controllers\CompanyController;
Route::get('/companies', [CompanyController::class, 'index']);
Route::post('/companies', [CompanyController::class, 'store']);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `"C:/php84/php.exe" artisan test --filter=CompanyTest`
Expected: PASS (4 passed).

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/CompanyController.php app/Http/Requests/StoreCompanyRequest.php routes/api.php tests/Feature/CompanyTest.php
git commit -m "feat: companies list + create with validation and audit"
```

---

## Task 8: Companies — show, update, status, reset-password

**Files:**
- Modify: `app/Http/Controllers/CompanyController.php`
- Create: `app/Http/Requests/UpdateCompanyRequest.php`
- Modify: `routes/api.php`
- Test: extend `tests/Feature/CompanyTest.php`

**Interfaces:**
- Produces: `GET /api/companies/{id}` (with branches + recent audit), `PUT /api/companies/{id}`, `PATCH /api/companies/{id}/status`, `POST /api/companies/{id}/reset-password`.

- [ ] **Step 1: Write the failing tests (append)**

Append to `tests/Feature/CompanyTest.php`:
```php
it('suspends and reactivates a company', function () {
    $c = MasterCompany::create(['name' => 'S', 'code' => 'S-1', 'admin_email' => 's@s.com', 'admin_password' => 'secret123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31']);
    $this->actingAs($this->admin, 'sanctum')->patchJson("/api/companies/{$c->id}/status", ['status' => 'suspended'])
        ->assertOk()->assertJsonPath('data.effective_status', 'suspended');
});
it('resets the admin password', function () {
    $c = MasterCompany::create(['name' => 'R', 'code' => 'R-1', 'admin_email' => 'r@r.com', 'admin_password' => 'secret123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31']);
    $this->actingAs($this->admin, 'sanctum')->postJson("/api/companies/{$c->id}/reset-password", [
        'admin_password' => 'NewPass@123', 'admin_password_confirmation' => 'NewPass@123',
    ])->assertOk();
    expect(\Hash::check('NewPass@123', $c->fresh()->admin_password))->toBeTrue();
});
```

- [ ] **Step 2: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=CompanyTest`
Expected: FAIL on the two new cases (404).

- [ ] **Step 3: Write UpdateCompanyRequest**

`app/Http/Requests/UpdateCompanyRequest.php`:
```php
<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        $id = $this->route('company');
        return [
            'name' => 'required|string|max:255',
            'code' => ['required','string','max:50', Rule::unique('master_companies','code')->ignore($id)],
            'gst_no' => 'nullable|string|max:50',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:40',
            'address' => 'nullable|string',
            'admin_email' => ['required','email', Rule::unique('master_companies','admin_email')->ignore($id)],
            'valid_from' => 'required|date',
            'valid_to' => 'required|date|after:valid_from',
            'plan' => 'required|in:starter,professional,enterprise',
            'max_branches' => 'required|integer|min:1',
            'max_rooms' => 'required|integer|min:1',
            'max_employees' => 'required|integer|min:1',
            'modules' => 'array',
        ];
    }
}
```

- [ ] **Step 4: Add controller methods**

Append to `CompanyController`:
```php
    public function show(MasterCompany $company) {
        $data = $this->decorate($company);
        $data['branches'] = $company->branches()->orderBy('name')->get();
        $data['audit'] = \App\Models\MasterAuditLog::where('entity', 'company')->where('entity_id', $company->id)
            ->orderByDesc('id')->limit(20)->get();
        return ['data' => $data];
    }
    public function update(\App\Http\Requests\UpdateCompanyRequest $r, MasterCompany $company) {
        $company->update($r->validated());
        AuditLogger::log($r->user()?->id, 'updated', 'company', $company->id);
        return ['data' => $this->decorate($company->fresh())];
    }
    public function setStatus(Request $r, MasterCompany $company) {
        $r->validate(['status' => 'required|in:active,suspended']);
        $company->update(['status' => $r->status]);
        AuditLogger::log($r->user()?->id, $r->status === 'suspended' ? 'suspended' : 'reactivated', 'company', $company->id);
        return ['data' => $this->decorate($company->fresh())];
    }
    public function resetPassword(Request $r, MasterCompany $company) {
        $r->validate(['admin_password' => 'required|string|min:8|confirmed']);
        $company->update(['admin_password' => $r->admin_password, 'force_password_change' => true]);
        AuditLogger::log($r->user()?->id, 'password_reset', 'company', $company->id);
        return ['ok' => true];
    }
```
Add `use App\Http\Requests\UpdateCompanyRequest;` at top if preferred (or use FQN as above).

- [ ] **Step 5: Wire routes**

Inside the `auth:sanctum` group:
```php
Route::get('/companies/{company}', [CompanyController::class, 'show']);
Route::put('/companies/{company}', [CompanyController::class, 'update']);
Route::patch('/companies/{company}/status', [CompanyController::class, 'setStatus']);
Route::post('/companies/{company}/reset-password', [CompanyController::class, 'resetPassword']);
```

- [ ] **Step 6: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=CompanyTest`
Expected: PASS (6 passed).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: company show/update/status/reset-password"
```

---

## Task 9: Branches CRUD with limit enforcement

**Files:**
- Create: `app/Http/Controllers/BranchController.php`
- Create: `app/Http/Requests/StoreBranchRequest.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/BranchTest.php`

**Interfaces:**
- Produces: `GET /api/companies/{company}/branches`, `POST /api/companies/{company}/branches`, `PUT /api/branches/{branch}`, `DELETE /api/branches/{branch}`. Enforces `max_branches`, `max_rooms`, `max_employees` server-side (422 on breach).

- [ ] **Step 1: Write the failing test**

`tests/Feature/BranchTest.php`:
```php
<?php
use App\Models\SuperAdmin;
use App\Models\MasterCompany;

beforeEach(function () {
    $this->admin = SuperAdmin::updateOrCreate(['email' => 'm@akilgroup.com'], ['name' => 'SA', 'password' => 'x', 'is_active' => true]);
    $this->company = MasterCompany::create(['name' => 'C', 'code' => 'C-1', 'admin_email' => 'c@c.com', 'admin_password' => 'secret123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31', 'max_branches' => 2, 'max_rooms' => 50, 'max_employees' => 30]);
});

it('adds a branch within limits', function () {
    $this->actingAs($this->admin, 'sanctum')->postJson("/api/companies/{$this->company->id}/branches", [
        'name' => 'Main', 'code' => 'MAIN', 'city' => 'Chennai', 'rooms_count' => 20, 'employees_count' => 10,
    ])->assertCreated()->assertJsonPath('data.code', 'MAIN');
});

it('rejects exceeding max_rooms', function () {
    $this->actingAs($this->admin, 'sanctum')->postJson("/api/companies/{$this->company->id}/branches", [
        'name' => 'Big', 'code' => 'BIG', 'rooms_count' => 60, 'employees_count' => 5,
    ])->assertStatus(422)->assertJsonValidationErrors('rooms_count');
});

it('rejects exceeding max_branches', function () {
    foreach (['A', 'B'] as $i => $code) {
        $this->company->branches()->create(['name' => $code, 'code' => $code, 'rooms_count' => 5, 'employees_count' => 2]);
    }
    $this->actingAs($this->admin, 'sanctum')->postJson("/api/companies/{$this->company->id}/branches", [
        'name' => 'C3', 'code' => 'C3', 'rooms_count' => 1, 'employees_count' => 1,
    ])->assertStatus(422)->assertJsonValidationErrors('code');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=BranchTest`
Expected: FAIL — route not defined.

- [ ] **Step 3: Write StoreBranchRequest**

`app/Http/Requests/StoreBranchRequest.php`:
```php
<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;

class StoreBranchRequest extends FormRequest {
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'city' => 'nullable|string|max:120',
            'address' => 'nullable|string',
            'rooms_count' => 'required|integer|min:0',
            'employees_count' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ];
    }
}
```

- [ ] **Step 4: Write BranchController with limit checks**

`app/Http/Controllers/BranchController.php`:
```php
<?php
namespace App\Http\Controllers;
use App\Http\Requests\StoreBranchRequest;
use App\Models\MasterCompany;
use App\Models\MasterBranch;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BranchController extends Controller {
    public function index(MasterCompany $company) {
        return ['data' => $company->branches()->orderBy('name')->get()];
    }

    public function store(StoreBranchRequest $r, MasterCompany $company) {
        $this->assertLimits($company, $r->rooms_count, $r->employees_count, true, $r->code);
        $branch = $company->branches()->create($r->validated());
        AuditLogger::log($r->user()?->id, 'created', 'branch', $branch->id, ['company' => $company->code]);
        return response()->json(['data' => $branch], 201);
    }

    public function update(StoreBranchRequest $r, MasterBranch $branch) {
        $this->assertLimits($branch->company, $r->rooms_count, $r->employees_count, false, $r->code, $branch->id);
        $branch->update($r->validated());
        AuditLogger::log($r->user()?->id, 'updated', 'branch', $branch->id);
        return ['data' => $branch->fresh()];
    }

    public function destroy(Request $r, MasterBranch $branch) {
        $id = $branch->id; $branch->delete();
        AuditLogger::log($r->user()?->id, 'deleted', 'branch', $id);
        return ['ok' => true];
    }

    private function assertLimits(MasterCompany $company, int $rooms, int $emps, bool $isNew, string $code, ?int $ignoreId = null): void {
        $branchQuery = $company->branches();
        if ($ignoreId) $branchQuery->where('id', '!=', $ignoreId);
        $existing = $branchQuery->get();
        $errors = [];
        if ($isNew && $company->branches()->count() >= $company->max_branches) {
            $errors['code'] = ["Branch limit reached ({$company->max_branches}). Upgrade the plan to add more."];
        }
        if ($existing->sum('rooms_count') + $rooms > $company->max_rooms) {
            $errors['rooms_count'] = ["Total rooms would exceed the plan limit ({$company->max_rooms})."];
        }
        if ($existing->sum('employees_count') + $emps > $company->max_employees) {
            $errors['employees_count'] = ["Total employees would exceed the plan limit ({$company->max_employees})."];
        }
        if ($errors) throw ValidationException::withMessages($errors);
    }
}
```

- [ ] **Step 5: Wire routes**

Inside the `auth:sanctum` group:
```php
use App\Http\Controllers\BranchController;
Route::get('/companies/{company}/branches', [BranchController::class, 'index']);
Route::post('/companies/{company}/branches', [BranchController::class, 'store']);
Route::put('/branches/{branch}', [BranchController::class, 'update']);
Route::delete('/branches/{branch}', [BranchController::class, 'destroy']);
```

- [ ] **Step 6: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=BranchTest`
Expected: PASS (3 passed).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: branches CRUD with server-side plan-limit enforcement"
```

---

## Task 10: Dashboard stats + audit log endpoints

**Files:**
- Create: `app/Http/Controllers/DashboardController.php`, `AuditLogController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/DashboardTest.php`

**Interfaces:**
- Produces: `GET /api/dashboard/stats` → `{total, active, expiring, expired_or_suspended}`; `GET /api/audit-logs` → recent rows.

- [ ] **Step 1: Write the failing test**

`tests/Feature/DashboardTest.php`:
```php
<?php
use App\Models\SuperAdmin;
use App\Models\MasterCompany;

beforeEach(fn () => $this->admin = SuperAdmin::updateOrCreate(['email' => 'm@akilgroup.com'], ['name' => 'SA', 'password' => 'x', 'is_active' => true]));

it('returns dashboard counts', function () {
    MasterCompany::create(['name' => 'A', 'code' => 'A-1', 'admin_email' => 'a@a.com', 'admin_password' => 'secret123', 'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31']);
    MasterCompany::create(['name' => 'B', 'code' => 'B-1', 'admin_email' => 'b@b.com', 'admin_password' => 'secret123', 'valid_from' => '2025-01-01', 'valid_to' => '2026-05-31']); // expired
    $this->actingAs($this->admin, 'sanctum')->getJson('/api/dashboard/stats')
        ->assertOk()->assertJsonPath('total', 2)->assertJsonPath('expired_or_suspended', 1);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=DashboardTest`
Expected: FAIL — 404.

- [ ] **Step 3: Write the controllers**

`app/Http/Controllers/DashboardController.php`:
```php
<?php
namespace App\Http\Controllers;
use App\Models\MasterCompany;
use App\Support\CompanyStatus;
use Carbon\Carbon;

class DashboardController extends Controller {
    public function stats() {
        $now = Carbon::now();
        $statuses = MasterCompany::all()->map(fn ($c) => CompanyStatus::derive($c->status, $c->valid_from, $c->valid_to, $now));
        return [
            'total' => $statuses->count(),
            'active' => $statuses->filter(fn ($s) => in_array($s, ['active', 'pending']))->count(),
            'expiring' => $statuses->where(null, 'expiring')->filter(fn ($s) => $s === 'expiring')->count(),
            'expired_or_suspended' => $statuses->filter(fn ($s) => in_array($s, ['expired', 'suspended']))->count(),
        ];
    }
}
```

`app/Http/Controllers/AuditLogController.php`:
```php
<?php
namespace App\Http\Controllers;
use App\Models\MasterAuditLog;

class AuditLogController extends Controller {
    public function index() {
        return ['data' => MasterAuditLog::orderByDesc('id')->limit(50)->get()];
    }
}
```

- [ ] **Step 4: Wire routes**

Inside the `auth:sanctum` group:
```php
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AuditLogController;
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
Route::get('/audit-logs', [AuditLogController::class, 'index']);
```

- [ ] **Step 5: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=DashboardTest`
Expected: PASS (1 passed).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: dashboard stats + audit-log endpoints"
```

---

## Task 11: Tenant authenticate endpoint (Phase 3 contract)

**Files:**
- Create: `app/Http/Controllers/TenantAuthController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/TenantAuthTest.php`

**Interfaces:**
- Produces: `POST /api/tenant/authenticate` body `{email, password}` → `{valid: bool, reason, company?}`. Reasons: `invalid_credentials`, `before_valid_from`, `expired`, `suspended`, `ok`. **Public route** (no auth) — consumed by the PMS later.

- [ ] **Step 1: Write the failing test**

`tests/Feature/TenantAuthTest.php`:
```php
<?php
use App\Models\MasterCompany;

function makeCompany($overrides = []) {
    return MasterCompany::create(array_merge([
        'name' => 'T', 'code' => 'T-1', 'admin_email' => 't@t.com', 'admin_password' => 'Secret@123',
        'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31', 'status' => 'active',
    ], $overrides));
}

it('authenticates a valid in-window company', function () {
    makeCompany();
    $this->postJson('/api/tenant/authenticate', ['email' => 't@t.com', 'password' => 'Secret@123'])
        ->assertOk()->assertJsonPath('valid', true)->assertJsonPath('reason', 'ok');
});
it('rejects wrong password', function () {
    makeCompany();
    $this->postJson('/api/tenant/authenticate', ['email' => 't@t.com', 'password' => 'nope'])
        ->assertJsonPath('valid', false)->assertJsonPath('reason', 'invalid_credentials');
});
it('rejects expired company', function () {
    makeCompany(['code' => 'T-2', 'admin_email' => 'e@e.com', 'valid_from' => '2025-01-01', 'valid_to' => '2026-05-31']);
    $this->postJson('/api/tenant/authenticate', ['email' => 'e@e.com', 'password' => 'Secret@123'])
        ->assertJsonPath('valid', false)->assertJsonPath('reason', 'expired');
});
it('rejects suspended company', function () {
    makeCompany(['code' => 'T-3', 'admin_email' => 's@s.com', 'status' => 'suspended']);
    $this->postJson('/api/tenant/authenticate', ['email' => 's@s.com', 'password' => 'Secret@123'])
        ->assertJsonPath('valid', false)->assertJsonPath('reason', 'suspended');
});
```

- [ ] **Step 2: Run to verify fail**

Run: `"C:/php84/php.exe" artisan test --filter=TenantAuthTest`
Expected: FAIL — 404.

- [ ] **Step 3: Write the controller**

`app/Http/Controllers/TenantAuthController.php`:
```php
<?php
namespace App\Http\Controllers;
use App\Models\MasterCompany;
use App\Support\CompanyStatus;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TenantAuthController extends Controller {
    public function authenticate(Request $r) {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $c = MasterCompany::where('admin_email', $data['email'])->first();
        if (!$c || !\Hash::check($data['password'], $c->admin_password)) {
            return ['valid' => false, 'reason' => 'invalid_credentials'];
        }
        $status = CompanyStatus::derive($c->status, $c->valid_from, $c->valid_to, Carbon::now());
        return match ($status) {
            'suspended' => ['valid' => false, 'reason' => 'suspended'],
            'expired' => ['valid' => false, 'reason' => 'expired'],
            'pending' => ['valid' => false, 'reason' => 'before_valid_from'],
            default => ['valid' => true, 'reason' => 'ok', 'company' => [
                'id' => $c->id, 'name' => $c->name, 'code' => $c->code, 'modules' => $c->modules,
                'valid_to' => $c->valid_to->toDateString(), 'force_password_change' => $c->force_password_change,
            ]],
        };
    }
}
```

- [ ] **Step 4: Wire the PUBLIC route**

In `routes/api.php`, **outside** the auth group:
```php
use App\Http\Controllers\TenantAuthController;
Route::post('/tenant/authenticate', [TenantAuthController::class, 'authenticate']);
```

- [ ] **Step 5: Run to verify pass**

Run: `"C:/php84/php.exe" artisan test --filter=TenantAuthTest`
Expected: PASS (4 passed).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: tenant/authenticate validity-gate endpoint (PMS contract) + tests"
```

---

## Task 12: Sample data seeder + full backend test run

**Files:**
- Modify: `database/seeders/MasterSeeder.php`

- [ ] **Step 1: Extend the seeder with sample companies**

Append inside `MasterSeeder::run()` after the super-admin:
```php
$samples = [
    ['name' => 'Grand Palace Resorts', 'code' => 'GPR-001', 'admin_email' => 'admin@grandpalace.com', 'plan' => 'enterprise',
     'valid_from' => '2026-01-01', 'valid_to' => '2026-12-31', 'max_branches' => 5, 'max_rooms' => 100, 'max_employees' => 200,
     'modules' => ['front_office','hk','accounts','hrms']],
    ['name' => 'Seabreeze Hotels', 'code' => 'SBH-014', 'admin_email' => 'it@seabreeze.in', 'plan' => 'professional',
     'valid_from' => '2026-03-15', 'valid_to' => '2026-07-14', 'max_branches' => 3, 'max_rooms' => 40, 'max_employees' => 40,
     'modules' => ['front_office','hrms']],
    ['name' => 'Riverside Comfort Inn', 'code' => 'RCI-009', 'admin_email' => 'admin@riverside.co', 'plan' => 'starter',
     'valid_from' => '2025-06-01', 'valid_to' => '2026-05-31', 'max_branches' => 1, 'max_rooms' => 15, 'max_employees' => 15,
     'modules' => ['front_office']],
];
foreach ($samples as $s) {
    \App\Models\MasterCompany::updateOrCreate(['code' => $s['code']], array_merge($s, ['admin_password' => 'Hotel@123']));
}
$gp = \App\Models\MasterCompany::where('code', 'GPR-001')->first();
$gp->branches()->updateOrCreate(['code' => 'GPR-CHN'], ['name' => 'Chennai Flagship', 'city' => 'Chennai', 'rooms_count' => 48, 'employees_count' => 60]);
```

- [ ] **Step 2: Re-seed**

Run: `"C:/php84/php.exe" artisan db:seed --class=MasterSeeder`
Expected: 1 super-admin + 3 companies + 1 branch, no errors.

- [ ] **Step 3: Run the full backend suite**

Run: `"C:/php84/php.exe" artisan test`
Expected: ALL PASS (Auth, Company, Branch, Dashboard, TenantAuth, CompanyStatus).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: sample data seeder; full backend suite green"
```

---

## Task 13: Scaffold the Next.js panel + theme + API client

**Files:**
- Create: `D:\masterhotel\masterhotel-web\` (Next.js app)
- Create: `masterhotel-web/app/globals.css` (theme from mockup), `lib/api.ts`, `lib/auth.ts`, `.env.local`

**Interfaces:**
- Produces: `api(path, opts)` fetch wrapper that attaches the bearer token from `localStorage` and prefixes `NEXT_PUBLIC_API_URL`; `requireAuth()`/`setToken()`/`clearToken()` helpers.

- [ ] **Step 1: Create the Next.js app**

```bash
cd /d/masterhotel
npx create-next-app@latest masterhotel-web --ts --app --no-tailwind --no-src-dir --no-eslint --use-npm
```
(Accept defaults; no Tailwind — we use plain CSS to match the mockup.)

- [ ] **Step 2: Set the API base**

`masterhotel-web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

- [ ] **Step 3: Port the theme into globals.css**

Replace `app/globals.css` with the `:root`/`[data-theme]` variables and component classes (`.app`, `.side`, `.panel`, `table`, `.badge`, `.drawer`, `.field`, etc.) copied from `hrms-master-sample.html`'s `<style>` block. (Source of truth for the look — copy verbatim, drop the `.bg`/login-only rules.)

- [ ] **Step 4: Write the API client**

`lib/api.ts`:
```ts
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function setToken(t: string) { localStorage.setItem("mh_token", t); }
export function getToken() { return typeof window !== "undefined" ? localStorage.getItem("mh_token") : null; }
export function clearToken() { localStorage.removeItem("mh_token"); }

export async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) { clearToken(); if (typeof window !== "undefined") window.location.href = "/login"; }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, body };
  return body;
}
```

`lib/auth.ts`:
```ts
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "./api";

export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => { if (!getToken()) router.replace("/login"); }, [router]);
}
```

- [ ] **Step 5: Verify the app builds and runs**

Run: `cd /d/masterhotel/masterhotel-web && npm run dev`
Expected: dev server on `http://localhost:3000`, default page renders.

- [ ] **Step 6: Commit**

```bash
cd /d/masterhotel/masterhotel-web && git init && git add -A
git commit -m "chore: scaffold masterhotel-web (Next.js) + theme + api client"
```

---

## Task 14: Login page

**Files:**
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: `api`, `setToken`. On success stores token and routes to `/dashboard`.

- [ ] **Step 1: Write the login page**

`app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("master@akilgroup.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try {
      const r = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(r.token); router.replace("/dashboard");
    } catch { setErr("Invalid email or password."); }
  }

  return (
    <div className="login-wrap">
      <form className="panel" style={{ maxWidth: 380, margin: "12vh auto", padding: 28 }} onSubmit={submit}>
        <h1 className="display" style={{ marginTop: 0 }}>masterhotel</h1>
        <p style={{ color: "var(--subtle)", marginTop: 4 }}>Super-admin sign in</p>
        <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {err && <p style={{ color: "var(--red)", fontSize: 13 }}>{err}</p>}
        <button className="btn primary" style={{ width: "100%", justifyContent: "center" }}>Sign in</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Manual verify**

Start backend (`artisan serve`) + frontend. Visit `/login`, sign in with `master@akilgroup.com` / `Master@2026`.
Expected: redirect to `/dashboard` (404 page for now is fine — built next), token in localStorage.

- [ ] **Step 3: Commit**

```bash
git add app/login && git commit -m "feat: super-admin login page"
```

---

## Task 15: Dashboard page (shell + stat cards)

**Files:**
- Create: `app/dashboard/page.tsx`, `components/StatCard.tsx`, `components/Shell.tsx` (sidebar + topbar)

**Interfaces:**
- Consumes: `api`, `useRequireAuth`. `GET /api/dashboard/stats`.
- Produces: `<Shell active="dashboard">` layout reused by all pages.

- [ ] **Step 1: Write the Shell (sidebar/topbar) from the mockup**

`components/Shell.tsx`: port the `.app` / `.side` (sidebar nav with links to `/dashboard`, `/companies`) and `.topbar` from `hrms-master-sample.html`, with `children` rendered inside `<main className="main">`. Include the theme toggle button (toggles `document.documentElement.dataset.theme`) and a logout button calling `clearToken()` → `/login`.

- [ ] **Step 2: Write StatCard + dashboard**

`components/StatCard.tsx`:
```tsx
export default function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="stat">
      <div className="lab"><span className="dot" style={{ background: color }} />{label}</div>
      <div className="val">{value}</div>{sub && <div className="sub">{sub}</div>}
    </div>
  );
}
```

`app/dashboard/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";
import Shell from "../../components/Shell";
import StatCard from "../../components/StatCard";

export default function Dashboard() {
  useRequireAuth();
  const [s, setS] = useState({ total: 0, active: 0, expiring: 0, expired_or_suspended: 0 });
  useEffect(() => { api("/dashboard/stats").then(setS).catch(() => {}); }, []);
  return (
    <Shell active="dashboard">
      <div className="head"><div><h1 className="display">Dashboard</h1><p>Platform overview.</p></div></div>
      <div className="stats">
        <StatCard label="Total Companies" value={s.total} color="var(--blue)" />
        <StatCard label="Active" value={s.active} color="var(--green)" />
        <StatCard label="Expiring ≤ 30 days" value={s.expiring} color="var(--amber)" />
        <StatCard label="Expired / Suspended" value={s.expired_or_suspended} color="var(--red)" />
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Manual verify**

Visit `/dashboard` while logged in. Expected: four cards with real seeded counts (Total 3).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard components/StatCard.tsx components/Shell.tsx
git commit -m "feat: dashboard shell + stat cards wired to API"
```

---

## Task 16: Companies list + create/edit drawer

**Files:**
- Create: `app/companies/page.tsx`, `components/CompanyDrawer.tsx`, `components/StatusBadge.tsx`

**Interfaces:**
- Consumes: `api`. `GET /api/companies`, `POST /api/companies`, `PUT /api/companies/{id}`.
- Produces: the Company Master table + slide-over form (the approved mockup, wired live).

- [ ] **Step 1: Write StatusBadge**

`components/StatusBadge.tsx`:
```tsx
const MAP: Record<string, string> = { active: "b-green", expiring: "b-amber", expired: "b-red", suspended: "b-red", pending: "b-blue" };
export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${MAP[status] || "b-blue"}`}><span className="d" />{status[0].toUpperCase() + status.slice(1)}</span>;
}
```

- [ ] **Step 2: Write CompanyDrawer (create/edit form)**

`components/CompanyDrawer.tsx`: port the slide-over `.drawer` markup from `hrms-master-sample.html` as a controlled React form with the three sections (Company Identity, Admin Login Credentials, Validity & Plan + module checkboxes). Props: `{ open, initial, onClose, onSaved }`. On submit POST (create) or PUT (edit) via `api`, surface 422 field errors inline (`err.body.errors`), call `onSaved()` on success. Password fields only required on create.

- [ ] **Step 3: Write the companies page**

`app/companies/page.tsx`:
```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";
import { useRequireAuth } from "../../lib/auth";
import Shell from "../../components/Shell";
import StatusBadge from "../../components/StatusBadge";
import CompanyDrawer from "../../components/CompanyDrawer";
import Link from "next/link";

type Co = { id: number; name: string; code: string; admin_email: string; valid_from: string; valid_to: string;
  plan: string; max_rooms: number; effective_status: string; branches_count: number };

export default function Companies() {
  useRequireAuth();
  const [rows, setRows] = useState<Co[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Co | null>(null);

  const load = useCallback(() => {
    api(`/companies${search ? `?search=${encodeURIComponent(search)}` : ""}`).then((r) => setRows(r.data)).catch(() => {});
  }, [search]);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell active="companies">
      <div className="head">
        <div><h1 className="display">Company Master</h1><p>Onboard companies, issue logins, set licence validity.</p></div>
        <button className="btn primary" style={{ marginLeft: "auto" }} onClick={() => { setEditing(null); setOpen(true); }}>+ New Company</button>
      </div>
      <div className="search" style={{ maxWidth: 320, marginBottom: 16 }}>
        <input placeholder="Search company, code or admin…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>Company</th><th>Admin Login</th><th>Validity</th><th>Plan</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/companies/${c.id}`}><b>{c.name}</b><br /><small>{c.code}</small></Link></td>
                <td>{c.admin_email}</td>
                <td><small>{c.valid_from} → {c.valid_to}</small></td>
                <td style={{ textTransform: "capitalize" }}>{c.plan}<br /><small>{c.branches_count} branches</small></td>
                <td><StatusBadge status={c.effective_status} /></td>
                <td><button className="btn" onClick={() => { setEditing(c); setOpen(true); }}>Edit</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} style={{ color: "var(--subtle)", textAlign: "center", padding: 30 }}>No companies yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <CompanyDrawer open={open} initial={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />
    </Shell>
  );
}
```

- [ ] **Step 4: Manual verify**

Visit `/companies`. Expected: 3 seeded companies with correct status badges (GPR active, SBH expiring, RCI expired). Click **New Company**, fill the form, save → row appears. Edit a company → changes persist. Try a `valid_to` before `valid_from` → inline error.

- [ ] **Step 5: Commit**

```bash
git add app/companies components/CompanyDrawer.tsx components/StatusBadge.tsx
git commit -m "feat: company master list + create/edit drawer wired to API"
```

---

## Task 17: Company detail + branches

**Files:**
- Create: `app/companies/[id]/page.tsx`, `components/BranchTable.tsx`

**Interfaces:**
- Consumes: `api`. `GET /api/companies/{id}`, branch endpoints, `PATCH .../status`, `POST .../reset-password`.

- [ ] **Step 1: Write BranchTable**

`components/BranchTable.tsx`: a table of branches (name, code, city, rooms_count, employees_count) with an inline add form posting to `/companies/{id}/branches`; surfaces 422 limit errors (rooms/employees/branch cap) inline. Props `{ companyId, branches, limits, onChanged }`.

- [ ] **Step 2: Write the detail page**

`app/companies/[id]/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/auth";
import Shell from "../../../components/Shell";
import StatusBadge from "../../../components/StatusBadge";
import BranchTable from "../../../components/BranchTable";

export default function CompanyDetail() {
  useRequireAuth();
  const { id } = useParams();
  const [c, setC] = useState<any>(null);
  const load = () => api(`/companies/${id}`).then((r) => setC(r.data)).catch(() => {});
  useEffect(() => { load(); }, [id]);
  if (!c) return <Shell active="companies"><p>Loading…</p></Shell>;

  const toggle = () => api(`/companies/${id}/status`, { method: "PATCH",
    body: JSON.stringify({ status: c.status === "suspended" ? "active" : "suspended" }) }).then(load);

  return (
    <Shell active="companies">
      <div className="head">
        <div><h1 className="display">{c.name}</h1><p>{c.code} · {c.admin_email}</p></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <StatusBadge status={c.effective_status} />
          <button className="btn" onClick={toggle}>{c.status === "suspended" ? "Reactivate" : "Suspend"}</button>
        </div>
      </div>
      <div className="panel" style={{ padding: 18, marginBottom: 18 }}>
        <p><b>Validity:</b> {c.valid_from} → {c.valid_to}</p>
        <p><b>Plan:</b> {c.plan} · Limits: {c.max_branches} branches / {c.max_rooms} rooms / {c.max_employees} employees</p>
        <p><b>Modules:</b> {(c.modules || []).join(", ") || "—"}</p>
      </div>
      <h3 className="display">Branches</h3>
      <BranchTable companyId={c.id} branches={c.branches} limits={{ max_branches: c.max_branches, max_rooms: c.max_rooms, max_employees: c.max_employees }} onChanged={load} />
    </Shell>
  );
}
```

- [ ] **Step 3: Manual verify**

Open a company → see profile, branches, suspend toggle. Add a branch within limits (ok), then one exceeding `max_rooms` → inline limit error. Suspend → status badge flips to Suspended; the company's `tenant/authenticate` would now return `suspended`.

- [ ] **Step 4: Commit**

```bash
git add app/companies components/BranchTable.tsx
git commit -m "feat: company detail + branches with limit-aware add"
```

---

## Task 18: End-to-end verification (Phase 1 done)

**Files:** none (verification only)

- [ ] **Step 1: Full backend suite**

Run: `cd /d/masterhotel/masterhotel-api && "C:/php84/php.exe" artisan test`
Expected: all green.

- [ ] **Step 2: End-to-end manual script**

Start both apps (backend `artisan serve` on :8000, frontend `npm run dev` on :3000). Then:
1. Log in as `master@akilgroup.com` / `Master@2026`.
2. Dashboard shows Total 3+.
3. Create a new company "Lakeview" with a 1-year validity → appears Active.
4. Edit it: set `valid_to` to yesterday → status shows Expired.
5. Add a branch; add another exceeding max_rooms → limit error.
6. Suspend the company → badge Suspended.
7. With curl: `curl -X POST localhost:8000/api/tenant/authenticate -H "Content-Type: application/json" -d '{"email":"<that admin_email>","password":"<pw>"}'` → `{"valid":false,"reason":"suspended"}`.

Expected: every step behaves as described.

- [ ] **Step 3: Final commit / tag**

```bash
cd /d/masterhotel/masterhotel-api && git add -A && git commit -m "chore: Phase 1 complete — masterhotel control plane local" --allow-empty
cd /d/masterhotel/masterhotel-web && git add -A && git commit -m "chore: Phase 1 complete — masterhotel panel local" --allow-empty
```

---

## Phase 2 (separate plan, after local sign-off)

Deploy to `168.144.26.131`: `pg_dump hotel_pms` backup → run the 4 additive master migrations on the server → build `masterhotel-web` (NODE_OPTIONS memory cap on the 1GB VPS) → nginx subdomain (e.g. `master.<domain>`) routing `/api` → masterhotel-api php-fpm and `/` → masterhotel-web on a new port → systemd service → seed super-admin → smoke test. HTTPS once a domain is attached.

## Phase 3 (separate plan)

In `hotel-pms-api`, change the PMS login to call `POST /api/tenant/authenticate` (or read `master_companies` directly since same DB) and block login when `valid:false`, surfacing the reason (expired/suspended) to the hotel user.

---

## Self-Review notes

- **Spec coverage:** super_admins/companies/branches/audit ✓ (T2–T3), auth ✓ (T6), companies CRUD+status+reset ✓ (T7–T8), branch limits ✓ (T9), dashboard+audit ✓ (T10), tenant/authenticate ✓ (T11), seed ✓ (T12), all frontend pages ✓ (T14–T17), validity gating contract ✓ (T11), error handling ✓ (422 inline throughout).
- **Limit enforcement** is server-side in `BranchController::assertLimits` (T9), matching the spec's "server-enforced, not just UI".
- **Status derivation** single source of truth `CompanyStatus::derive` reused by index/show/dashboard/tenant-auth — no duplicated logic.
- **Naming consistency:** `effective_status`, `branches_count`, `admin_email`, `valid_from/valid_to`, `max_branches/max_rooms/max_employees` identical across backend and frontend tasks.
