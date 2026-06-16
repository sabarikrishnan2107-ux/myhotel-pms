# Make Mock Features Live — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace six hardcoded-mock UI areas (folio adjustments/comps, folio e-Invoice, folio KYC, accounts dashboards, competitor rate shop, group pricing) with real Postgres-backed, fully interactive features.

**Architecture:** Backend is Laravel; almost all list data flows through one generic `ResourceController` (a `MODELS`/`RULES`/`REQUIRED_ON_CREATE` registry + optional `FILTER_BY`). New tables are added by: migration → model (`$guarded=['id']` + casts) → register in `ResourceController` → seeder → feature test. Two endpoints are custom (`GET /accounts/summary` aggregation, `POST /einvoices/generate/{bookingNo}` server-side IRN generation). Frontend is Next.js (modified fork — see caveat below); pages already use `apiGet/apiPost/apiDelete` from `@/lib/api`, so rewiring means swapping mock-constant imports for API calls.

**Tech Stack:** Laravel 11 + PostgreSQL (camelCase columns), PHPUnit feature tests, Next.js + React + TypeScript.

**Conventions (verified in repo):**
- Columns are **camelCase** (e.g. `bookingNo`, `roomType`), models use `protected $guarded = ['id']` and `protected $casts`.
- Resource slugs are kebab-case; routes auto-generated from `ResourceController::resources()`.
- Seeders are idempotent via `firstOrCreate`/`updateOrCreate` and registered in `DatabaseSeeder::run()`.
- Migration filenames sort after the latest existing one (`2026_06_13_000200_*`). Use `2026_06_16_0000NN_*`.
- All `/api/*` routes except `/login` require `auth:sanctum`. Tests authenticate via `$this->actingAs(User::factory()->create(), 'sanctum')`.

**FRONTEND CAVEAT (from `luxe-pms/AGENTS.md` — user instruction, highest priority):** This is a modified Next.js. Before writing ANY frontend code, read the relevant guide under `luxe-pms/node_modules/next/dist/docs/` and read the full target page file. The data-fetching edits in this plan mirror patterns already present in those same files (client component + `React.useEffect` + `apiGet`), so follow the existing in-file style.

**Backend test command (run from `hotel-pms-api/`):**
`C:/php84/php.exe artisan test --filter <TestName>`
(Per project memory, use `C:/php84/php.exe` — it has the pgsql extension.)

---

## File Structure

**Backend (new files under `hotel-pms-api/`):**
- `database/migrations/2026_06_16_000001_create_folio_adjustments_table.php`
- `database/migrations/2026_06_16_000002_add_kyc_to_guests_table.php`
- `database/migrations/2026_06_16_000003_create_einvoices_table.php`
- `database/migrations/2026_06_16_000004_create_competitors_table.php`
- `database/migrations/2026_06_16_000005_create_competitor_rates_table.php`
- `database/migrations/2026_06_16_000006_create_meal_plans_table.php`
- `app/Models/FolioAdjustment.php`, `EInvoice.php`, `Competitor.php`, `CompetitorRate.php`, `MealPlan.php`
- `app/Http/Controllers/Api/EInvoiceController.php`
- `database/seeders/FolioAdjustmentSeeder.php`, `EInvoiceSeeder.php` (optional/skip), `CompetitorSeeder.php`, `MealPlanSeeder.php`
- `tests/Feature/MockToLiveTest.php`

**Backend (modified):**
- `app/Http/Controllers/Api/ResourceController.php` — register 5 resources
- `app/Http/Controllers/Api/StatsController.php` — add `accountsSummary()`
- `routes/api.php` — add `/accounts/summary` + e-invoice generate route
- `database/seeders/DatabaseSeeder.php` — register new seeders

**Frontend (modified under `luxe-pms/src/`):**
- `app/(app)/folio/[id]/page.tsx` — adjustments, e-Invoice, KYC live
- `app/(app)/accounts/page.tsx` — dashboards from `/accounts/summary`
- `app/(app)/revenue/comp-shop/page.tsx` — competitors + rates live
- `app/(app)/revenue/group-quote/page.tsx` — meal plans / packages / venues live

---

## Task 1: Folio Adjustments — backend resource

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_16_000001_create_folio_adjustments_table.php`
- Create: `hotel-pms-api/app/Models/FolioAdjustment.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`
- Create: `hotel-pms-api/tests/Feature/MockToLiveTest.php`

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/MockToLiveTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockToLiveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_folio_adjustments_crud_and_filter(): void
    {
        $this->postJson('/api/folio-adjustments', [
            'bookingNo' => 'BK101083', 'type' => 'Comp',
            'description' => 'Welcome amenity (VIP)', 'amount' => -120, 'approver' => 'Auto · VIP policy',
        ])->assertCreated()->assertJsonFragment(['amount' => -120]);

        $this->postJson('/api/folio-adjustments', [
            'bookingNo' => 'BK999', 'type' => 'Discount', 'amount' => -50,
        ])->assertCreated();

        $this->getJson('/api/folio-adjustments?bookingNo=BK101083')
            ->assertOk()->assertJsonCount(1)
            ->assertJsonFragment(['description' => 'Welcome amenity (VIP)']);
    }

    public function test_folio_adjustment_requires_amount(): void
    {
        $this->postJson('/api/folio-adjustments', ['bookingNo' => 'BK1', 'type' => 'Comp'])
            ->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: FAIL — `folio-adjustments` is not a routed resource, POST returns 404/405.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_16_000001_create_folio_adjustments_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folio_adjustments', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->index();
            $t->string('date')->default('');         // YYYY-MM-DD
            $t->string('type')->default('Discount');  // Discount | Comp
            $t->string('description')->default('');
            $t->integer('amount')->default(0);         // signed; comps/discounts negative
            $t->string('approver')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folio_adjustments');
    }
};
```

- [ ] **Step 4: Create the model**

Create `hotel-pms-api/app/Models/FolioAdjustment.php`:

```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FolioAdjustment extends Model {
    protected $table = 'folio_adjustments';
    protected $guarded = ['id'];
    protected $casts = ['amount' => 'integer'];
}
```

- [ ] **Step 5: Register the resource in ResourceController**

In `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`:

5a. Add the import near the other `use App\Models\...` lines (alphabetical-ish, after `FolioCharge`):
```php
use App\Models\FolioAdjustment;
```

5b. In the `MODELS` const, add after the `'folio-payments'` line:
```php
        'folio-adjustments'      => FolioAdjustment::class,
```

5c. In the `FILTER_BY` const, add:
```php
        'folio-adjustments' => 'bookingNo',
```

5d. In the `RULES` const, add a new entry (place near `folio-charges`):
```php
        'folio-adjustments' => [
            'bookingNo' => 'string|max:50', 'date' => 'string|max:50',
            'type' => 'string|max:50', 'description' => 'string|max:500',
            'amount' => 'integer', 'approver' => 'string|max:255',
        ],
```

5e. In the `REQUIRED_ON_CREATE` const, add:
```php
        'folio-adjustments' => ['bookingNo', 'type', 'amount'],
```

- [ ] **Step 6: Run the test, verify it passes**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: PASS (both methods).

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_16_000001_create_folio_adjustments_table.php hotel-pms-api/app/Models/FolioAdjustment.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/MockToLiveTest.php
git commit -m "feat(folio): folio-adjustments resource (comps/discounts)"
```

---

## Task 2: Folio Adjustments — seeder

**Files:**
- Create: `hotel-pms-api/database/seeders/FolioAdjustmentSeeder.php`
- Modify: `hotel-pms-api/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create the seeder**

Create `hotel-pms-api/database/seeders/FolioAdjustmentSeeder.php`. Use the values currently hardcoded in `folio/[id]/page.tsx` (`ADJUSTMENTS`). The `bookingNo` must match a seeded booking — pick the first seeded booking number; if unknown at write time use `'BK100001'` (adjust to a real seeded booking after running `GuestBookingSeeder`).

```php
<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\FolioAdjustment;
use Illuminate\Database\Seeder;

class FolioAdjustmentSeeder extends Seeder
{
    public function run(): void
    {
        // Attach demo comps to the first seeded booking so the folio page shows real rows.
        $bookingNo = Booking::orderBy('id')->value('bookingNo') ?? 'BK100001';

        $rows = [
            ['bookingNo' => $bookingNo, 'date' => '2026-05-24', 'type' => 'Discount',
             'description' => 'Loyalty member 10% on F&B', 'amount' => -85, 'approver' => 'Tom W. (Mgr)'],
            ['bookingNo' => $bookingNo, 'date' => '2026-05-25', 'type' => 'Comp',
             'description' => 'Comp — Welcome amenity (VIP)', 'amount' => -120, 'approver' => 'Auto · VIP policy'],
        ];

        foreach ($rows as $row) {
            FolioAdjustment::firstOrCreate(
                ['bookingNo' => $row['bookingNo'], 'description' => $row['description']],
                $row,
            );
        }
    }
}
```

- [ ] **Step 2: Register in DatabaseSeeder**

In `hotel-pms-api/database/seeders/DatabaseSeeder.php`, add inside the `$this->call([...])` array after `FolioSeeder::class,`:
```php
            FolioAdjustmentSeeder::class,
```

- [ ] **Step 3: Run the seeder to verify it works**

Run: `C:/php84/php.exe artisan db:seed --class=FolioAdjustmentSeeder`
Expected: completes with no error; running twice does not duplicate rows.

- [ ] **Step 4: Commit**

```bash
git add hotel-pms-api/database/seeders/FolioAdjustmentSeeder.php hotel-pms-api/database/seeders/DatabaseSeeder.php
git commit -m "feat(folio): seed demo folio adjustments"
```

---

## Task 3: Folio Adjustments — frontend wiring

**Files:**
- Modify: `luxe-pms/src/app/(app)/folio/[id]/page.tsx`

- [ ] **Step 1: Read the file and the Next.js docs**

Read `luxe-pms/src/app/(app)/folio/[id]/page.tsx` in full and the relevant guide under `luxe-pms/node_modules/next/dist/docs/` (per AGENTS.md).

- [ ] **Step 2: Replace the hardcoded `ADJUSTMENTS` constant with live state**

At `folio/[id]/page.tsx:33-36`, delete the `const ADJUSTMENTS = [...]` block. Define the row type instead:

```tsx
type Adjustment = { id: string; date: string; type: "Discount" | "Comp"; description: string; amount: number; approver?: string };
```

- [ ] **Step 3: Replace adjustment state**

At `folio/[id]/page.tsx:85`, replace:
```tsx
  const [extraAdjustments, setExtraAdjustments] = React.useState<typeof ADJUSTMENTS>([]);
```
with:
```tsx
  const [adjustments, setAdjustments] = React.useState<Adjustment[]>([]);
```

- [ ] **Step 4: Load adjustments in the existing effect**

In the `React.useEffect` at `folio/[id]/page.tsx:90-100`, add a fetch alongside the existing folio-charges/folio-payments loads:
```tsx
    apiGet<Adjustment[]>(`/folio-adjustments${q}`)
      .then(rows => { if (!cancelled) setAdjustments(rows); }).catch(() => {});
```

- [ ] **Step 5: Use live adjustments in totals**

At `folio/[id]/page.tsx:106`, replace:
```tsx
  const mergedAdjustments = [...ADJUSTMENTS, ...extraAdjustments];
```
with:
```tsx
  const mergedAdjustments = adjustments;
```
(The downstream `adjustmentsTotal`/`grandTotal` math at lines 120-121 already references `mergedAdjustments` and the per-row `.amount`/`.desc` — update any reference to `a.desc` to `a.description` in the Adjustments & Comps render block.)

- [ ] **Step 6: Wire the add/delete handlers to the API**

Find the "Adjustments & Comps" card render (around `folio/[id]/page.tsx:350`) and the Discount modal handler. On adding a discount/comp, persist it:
```tsx
    apiPost<Adjustment>("/folio-adjustments", {
      bookingNo: reservation.bookingNo, date: new Date().toISOString().slice(0, 10),
      type, description, amount, approver,
    }).then(row => setAdjustments(prev => [...prev, row])).catch(() => showToast("Could not save adjustment"));
```
Add a delete control on each adjustment row:
```tsx
    apiDelete(`/folio-adjustments/${row.id}`).then(() => setAdjustments(prev => prev.filter(a => a.id !== row.id))).catch(() => showToast("Could not remove"));
```

- [ ] **Step 7: Build to verify no type errors**

Run (from `luxe-pms/`): `npm run build` (or `npx tsc --noEmit`).
Expected: compiles; no reference to the removed `ADJUSTMENTS` constant remains.

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/app/(app)/folio/[id]/page.tsx"
git commit -m "feat(folio): load adjustments/comps from API"
```

---

## Task 4: Guest KYC — backend columns + verify

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_16_000002_add_kyc_to_guests_table.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (guests RULES)
- Modify: `hotel-pms-api/tests/Feature/MockToLiveTest.php`

- [ ] **Step 1: Write the failing test**

Add to `MockToLiveTest`:
```php
    public function test_guest_kyc_can_be_verified(): void
    {
        $id = $this->postJson('/api/guests', ['name' => 'Asha'])->json('id');

        $this->putJson("/api/guests/{$id}", [
            'idType' => 'Aadhaar', 'idNumber' => 'XXXX-1234',
            'kycVerified' => true, 'kycVerifiedAt' => '2026-06-16 14:08', 'kycVerifiedBy' => 'Front Desk',
        ])->assertOk()->assertJsonFragment(['kycVerified' => true]);

        $this->assertDatabaseHas('guests', ['id' => $id, 'kycVerified' => true, 'idType' => 'Aadhaar']);
    }
```

- [ ] **Step 2: Run, verify it fails**

Run: `C:/php84/php.exe artisan test --filter test_guest_kyc_can_be_verified`
Expected: FAIL — `kycVerified` column does not exist / not in RULES.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_16_000002_add_kyc_to_guests_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $t) {
            $t->boolean('kycVerified')->default(false);
            $t->string('kycVerifiedAt')->nullable();
            $t->string('kycVerifiedBy')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $t) {
            $t->dropColumn(['kycVerified', 'kycVerifiedAt', 'kycVerifiedBy']);
        });
    }
};
```

- [ ] **Step 4: Add casts + RULES**

4a. In `hotel-pms-api/app/Models/Guest.php`, add `'kycVerified' => 'boolean'` to the `$casts` array.

4b. In `ResourceController.php`, find the existing `'guests' => [ ... ]` RULES entry and add:
```php
            'kycVerified' => 'boolean', 'kycVerifiedAt' => 'string|max:50',
            'kycVerifiedBy' => 'string|max:255', 'idType' => 'string|max:50',
            'idNumber' => 'string|max:100',
```
(If `idType`/`idNumber` already appear in the guests RULES, do not duplicate them.)

- [ ] **Step 5: Run, verify it passes**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: PASS (all methods so far).

- [ ] **Step 6: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_16_000002_add_kyc_to_guests_table.php hotel-pms-api/app/Models/Guest.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/MockToLiveTest.php
git commit -m "feat(guest): KYC verification columns + rules"
```

---

## Task 5: Guest KYC — frontend wiring

**Files:**
- Modify: `luxe-pms/src/app/(app)/folio/[id]/page.tsx`

- [ ] **Step 1: Load the live guest**

The page currently derives `guest` from the `GUESTS` mock (`folio/[id]/page.tsx:63`). Add live guest state and fetch by name from the booking:
```tsx
  const [liveGuest, setLiveGuest] = React.useState<{ id: number; name: string; idType?: string; idNumber?: string; kycVerified?: boolean; kycVerifiedAt?: string; kycVerifiedBy?: string; nationality?: string } | null>(null);
```
In the load effect, after the booking loads:
```tsx
    apiGet<{ id: number; name: string }[]>("/guests")
      .then(rows => { if (!cancelled) { const g = rows.find(x => x.name === (liveRes?.guestName ?? reservation.guestName)); if (g) setLiveGuest(g as never); } }).catch(() => {});
```
Use `const guest = liveGuest ?? GUESTS.find(...)` so the panel reads real data when present.

- [ ] **Step 2: Render KYC from live fields**

In the "Identification Verified" card (around `folio/[id]/page.tsx:448-456`), replace the hardcoded "Verified" badge and "Verified On 23 May 2026, 14:08" with:
- Badge tone `success` only when `guest?.kycVerified`, else `warning` / "Pending".
- `ID Type` = `guest?.idType || "—"`, `ID Number` = `guest?.idNumber || "—"`, `Verified On` = `guest?.kycVerifiedAt || "—"`.

- [ ] **Step 3: Add a "Verify KYC" action**

Add a button + small inline form (ID type select + ID number input) that calls:
```tsx
    apiPut(`/guests/${guest.id}`, {
      idType, idNumber, kycVerified: true,
      kycVerifiedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      kycVerifiedBy: "Front Desk",
    }).then(() => { setLiveGuest(prev => prev ? { ...prev, idType, idNumber, kycVerified: true } : prev); showToast("KYC verified"); })
      .catch(() => showToast("Could not verify"));
```
(Import `apiPut` from `@/lib/api`.)

- [ ] **Step 4: Build**

Run (from `luxe-pms/`): `npm run build`
Expected: compiles.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/folio/[id]/page.tsx"
git commit -m "feat(folio): live Guest KYC display + verify action"
```

---

## Task 6: e-Invoice — backend resource + generate endpoint

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_16_000003_create_einvoices_table.php`
- Create: `hotel-pms-api/app/Models/EInvoice.php`
- Create: `hotel-pms-api/app/Http/Controllers/Api/EInvoiceController.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`
- Modify: `hotel-pms-api/routes/api.php`
- Modify: `hotel-pms-api/tests/Feature/MockToLiveTest.php`

- [ ] **Step 1: Write the failing test**

Add to `MockToLiveTest`:
```php
    public function test_einvoice_generate_persists_a_row(): void
    {
        $res = $this->postJson('/api/einvoices/generate/BK101083', [
            'taxableValue' => 10000, 'cgst' => 900, 'sgst' => 900, 'igst' => 0,
            'placeOfSupply' => 'Maharashtra (27)', 'recipientGstin' => null,
        ])->assertOk()->assertJsonFragment(['status' => 'generated']);

        $this->assertNotEmpty($res->json('irn'));
        $this->assertDatabaseHas('einvoices', ['bookingNo' => 'BK101083', 'status' => 'generated']);

        // GET filtered by bookingNo returns it
        $this->getJson('/api/einvoices?bookingNo=BK101083')->assertOk()->assertJsonCount(1);
    }
```

- [ ] **Step 2: Run, verify it fails**

Run: `C:/php84/php.exe artisan test --filter test_einvoice_generate_persists_a_row`
Expected: FAIL — route + table missing.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_16_000003_create_einvoices_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('einvoices', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->index();
            $t->string('irn', 64)->nullable();
            $t->string('ackNo')->nullable();
            $t->string('ackDate')->nullable();
            $t->string('status')->default('draft');     // draft | generated
            $t->string('placeOfSupply')->nullable();
            $t->string('recipientGstin')->nullable();
            $t->boolean('reverseCharge')->default(false);
            $t->json('signedJson')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('einvoices');
    }
};
```

- [ ] **Step 4: Create the model**

Create `hotel-pms-api/app/Models/EInvoice.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class EInvoice extends Model {
    protected $table = 'einvoices';
    protected $guarded = ['id'];
    protected $casts = ['reverseCharge' => 'boolean', 'signedJson' => 'array'];
}
```

- [ ] **Step 5: Register `einvoices` as a filtered resource**

In `ResourceController.php`: add `use App\Models\EInvoice;`; add `'einvoices' => EInvoice::class,` to `MODELS`; add `'einvoices' => 'bookingNo',` to `FILTER_BY`; add to `RULES`:
```php
        'einvoices' => [
            'bookingNo' => 'string|max:50', 'irn' => 'string|max:64', 'ackNo' => 'string|max:50',
            'ackDate' => 'string|max:50', 'status' => 'string|max:50',
            'placeOfSupply' => 'string|max:100', 'recipientGstin' => 'string|max:50',
            'reverseCharge' => 'boolean',
        ],
```
and to `REQUIRED_ON_CREATE`: `'einvoices' => ['bookingNo'],`.

- [ ] **Step 6: Create the generate controller**

Create `hotel-pms-api/app/Http/Controllers/Api/EInvoiceController.php`:
```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EInvoice;
use Illuminate\Http\Request;

/**
 * e-Invoice generation. NOTE: the IRN/ACK are generated LOCALLY (deterministic
 * hash of the invoice payload) — they are NOT issued by the government NIC
 * e-Invoice portal. This is the integration swap-in point for a real GST
 * Suvidha Provider (GSP): replace the generate() body with a GSP API call.
 */
class EInvoiceController extends Controller
{
    public function generate(Request $request, string $bookingNo)
    {
        $data = $request->validate([
            'taxableValue'   => 'nullable|integer',
            'cgst'           => 'nullable|integer',
            'sgst'           => 'nullable|integer',
            'igst'           => 'nullable|integer',
            'placeOfSupply'  => 'nullable|string|max:100',
            'recipientGstin' => 'nullable|string|max:50',
            'reverseCharge'  => 'nullable|boolean',
        ]);

        $payload = [
            'bookingNo'    => $bookingNo,
            'taxableValue' => $data['taxableValue'] ?? 0,
            'cgst'         => $data['cgst'] ?? 0,
            'sgst'         => $data['sgst'] ?? 0,
            'igst'         => $data['igst'] ?? 0,
            'generatedAt'  => now()->toIso8601String(),
        ];

        // Locally-generated IRN: 64-char SHA-256 of the payload (mirrors the real
        // IRN's shape so the UI/DB are ready for a genuine GSP value later).
        $irn = hash('sha256', json_encode($payload));
        $ackNo = (string) (110000000000000 + (crc32($bookingNo) % 9000000000000));

        $row = EInvoice::updateOrCreate(
            ['bookingNo' => $bookingNo],
            [
                'irn'            => $irn,
                'ackNo'          => $ackNo,
                'ackDate'        => now()->format('d M Y, H:i'),
                'status'         => 'generated',
                'placeOfSupply'  => $data['placeOfSupply'] ?? null,
                'recipientGstin' => $data['recipientGstin'] ?? null,
                'reverseCharge'  => $data['reverseCharge'] ?? false,
                'signedJson'     => $payload,
            ],
        );

        return response()->json($row);
    }
}
```

- [ ] **Step 7: Add the route**

In `hotel-pms-api/routes/api.php`, inside the `auth:sanctum` group (e.g. just after the night-audit route), add:
```php
    use App\Http\Controllers\Api\EInvoiceController;
    // ... (add the import at the top with the other controller imports)
    Route::post('/einvoices/generate/{bookingNo}', [EInvoiceController::class, 'generate']);
```
Place the `use App\Http\Controllers\Api\EInvoiceController;` with the other top-of-file imports, and the `Route::post(...)` line inside the middleware group **before** the generic `$resources` catch-all routes at the bottom.

- [ ] **Step 8: Run, verify it passes**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_16_000003_create_einvoices_table.php hotel-pms-api/app/Models/EInvoice.php hotel-pms-api/app/Http/Controllers/Api/EInvoiceController.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/routes/api.php hotel-pms-api/tests/Feature/MockToLiveTest.php
git commit -m "feat(folio): e-invoice table + local IRN generate endpoint"
```

---

## Task 7: e-Invoice — frontend wiring

**Files:**
- Modify: `luxe-pms/src/app/(app)/folio/[id]/page.tsx`

- [ ] **Step 1: Add e-invoice state + load**

Add state for the stored e-invoice and load it in the effect:
```tsx
  const [einvoice, setEinvoice] = React.useState<{ irn?: string; ackNo?: string; ackDate?: string; status?: string; placeOfSupply?: string; recipientGstin?: string; signedJson?: unknown } | null>(null);
```
In the load effect:
```tsx
    apiGet<typeof einvoice[]>(`/einvoices${q}`)
      .then(rows => { if (!cancelled && rows.length) setEinvoice(rows[0] as never); }).catch(() => {});
```

- [ ] **Step 2: Render from stored row, not the JS-derived IRN**

Delete the local IRN derivation at `folio/[id]/page.tsx:115-119` (`irnSeed`, `eInvoiceIrn`, `eInvoiceAckNo`). In the "e-Invoice Compliance" card:
- Badge: `einvoice?.status === "generated" ? "Generated" : "Not generated"`.
- IRN row: `einvoice?.irn ? einvoice.irn.slice(0, 20) + "…" : "—"`; ACK No.: `einvoice?.ackNo ?? "—"`; ACK Date: `einvoice?.ackDate ?? "—"`.
- Add a small caption: `Locally generated — not NIC-issued`.

- [ ] **Step 3: Wire "Generate e-Invoice"**

Add/repurpose a button that posts the real computed totals:
```tsx
    apiPost<typeof einvoice>(`/einvoices/generate/${reservation.bookingNo}`, {
      taxableValue: chargesSubtotal, cgst, sgst, igst,
      placeOfSupply: "Maharashtra (27)", recipientGstin: null, reverseCharge: false,
    }).then(row => { setEinvoice(row as never); showToast("e-Invoice generated"); })
      .catch(() => showToast("Could not generate e-Invoice"));
```
"Download Signed JSON" should serialize `einvoice?.signedJson`; "View QR" uses `einvoice?.irn`.

- [ ] **Step 4: Build**

Run (from `luxe-pms/`): `npm run build`
Expected: compiles; no reference to removed `eInvoiceIrn`/`eInvoiceAckNo` remains.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/folio/[id]/page.tsx"
git commit -m "feat(folio): e-invoice panel reads/generates from API"
```

---

## Task 8: Accounts dashboards — aggregation endpoint

**Files:**
- Modify: `hotel-pms-api/app/Http/Controllers/Api/StatsController.php`
- Modify: `hotel-pms-api/routes/api.php`
- Modify: `hotel-pms-api/tests/Feature/MockToLiveTest.php`

- [ ] **Step 1: Write the failing test**

Add to `MockToLiveTest`:
```php
    public function test_accounts_summary_aggregates_entries(): void
    {
        $this->postJson('/api/account-entries', ['type' => 'income', 'category' => 'Room', 'description' => 'Room rev', 'amount' => 10000]);
        $this->postJson('/api/account-entries', ['type' => 'income', 'category' => 'Room', 'description' => 'Room rev 2', 'amount' => 5000]);
        $this->postJson('/api/account-entries', ['type' => 'expense', 'category' => 'Payroll', 'description' => 'Salary', 'amount' => 8000]);

        $res = $this->getJson('/api/accounts/summary')->assertOk()
            ->assertJsonStructure(['income', 'expense', 'recent']);

        $income = collect($res->json('income'))->firstWhere('category', 'Room');
        $this->assertSame(15000, $income['value']);
    }
```

- [ ] **Step 2: Run, verify it fails**

Run: `C:/php84/php.exe artisan test --filter test_accounts_summary_aggregates_entries`
Expected: FAIL — route missing (404).

- [ ] **Step 3: Add the controller method**

In `StatsController.php`, add `use App\Models\AccountEntry;` at the top, and add this method to the class:
```php
    /**
     * GET /api/accounts/summary — income & expense broken down by category,
     * plus the most recent transactions, aggregated from real account_entries.
     */
    public function accountsSummary(\Illuminate\Http\Request $request)
    {
        $base = AccountEntry::query();
        if ($request->filled('from')) $base->where('date', '>=', $request->query('from'));
        if ($request->filled('to'))   $base->where('date', '<=', $request->query('to'));

        $byCat = fn (string $type) => (clone $base)->where('type', $type)
            ->selectRaw('category, coalesce(sum(amount),0) as value')
            ->groupBy('category')->orderByDesc('value')->get()
            ->map(fn ($r) => ['category' => $r->category ?: 'Other', 'value' => (int) $r->value])
            ->values();

        $recent = (clone $base)->orderByDesc('id')->limit(8)->get()
            ->map(fn ($e) => [
                'id' => $e->id, 'date' => $e->date, 'desc' => $e->description,
                'type' => ucfirst($e->type), 'amount' => (int) $e->amount,
            ])->values();

        return response()->json([
            'income'  => $byCat('income'),
            'expense' => $byCat('expense'),
            'recent'  => $recent,
        ]);
    }
```

- [ ] **Step 4: Add the route**

In `routes/api.php`, inside the `auth:sanctum` group near the other `StatsController` routes (after `/revenue/pickup`), add:
```php
    Route::get('/accounts/summary', [StatsController::class, 'accountsSummary']);
```

- [ ] **Step 5: Run, verify it passes**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hotel-pms-api/app/Http/Controllers/Api/StatsController.php hotel-pms-api/routes/api.php hotel-pms-api/tests/Feature/MockToLiveTest.php
git commit -m "feat(accounts): /accounts/summary aggregation endpoint"
```

---

## Task 9: Accounts dashboards — frontend wiring

**Files:**
- Modify: `luxe-pms/src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Read the file**

Read `luxe-pms/src/app/(app)/accounts/page.tsx`, focusing on where `INCOME_BREAKDOWN`, `EXPENSE_BREAKDOWN`, `RECENT_TXN` (imported from `@/lib/mock-data-ext`) are consumed.

- [ ] **Step 2: Add live summary state + load**

```tsx
  const [summary, setSummary] = React.useState<{ income: { category: string; value: number }[]; expense: { category: string; value: number }[]; recent: { id: number; date: string; desc: string; type: string; amount: number }[] }>({ income: [], expense: [], recent: [] });
  React.useEffect(() => {
    let cancelled = false;
    apiGet<typeof summary>("/accounts/summary").then(s => { if (!cancelled) setSummary(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
```
Ensure `apiGet` is imported (it already is).

- [ ] **Step 3: Replace mock references**

Replace usages of `INCOME_BREAKDOWN` → `summary.income`, `EXPENSE_BREAKDOWN` → `summary.expense`, `RECENT_TXN` → `summary.recent`. The breakdown items previously had a `label`/`color`; map `category` → label and keep the existing color palette by index. Remove the now-unused `INCOME_BREAKDOWN, EXPENSE_BREAKDOWN, RECENT_TXN` names from the `@/lib/mock-data-ext` import (leave any other imports from that module intact).

- [ ] **Step 4: Build**

Run (from `luxe-pms/`): `npm run build`
Expected: compiles; no unresolved references.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/accounts/page.tsx"
git commit -m "feat(accounts): dashboards from /accounts/summary"
```

---

## Task 10: Competitor Rate Shop — backend resources

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_16_000004_create_competitors_table.php`
- Create: `hotel-pms-api/database/migrations/2026_06_16_000005_create_competitor_rates_table.php`
- Create: `hotel-pms-api/app/Models/Competitor.php`, `CompetitorRate.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`
- Modify: `hotel-pms-api/tests/Feature/MockToLiveTest.php`

- [ ] **Step 1: Write the failing test**

Add to `MockToLiveTest`:
```php
    public function test_competitors_and_rates_crud(): void
    {
        $this->postJson('/api/competitors', ['hotel' => 'The Westin', 'brand' => 'Marriott', 'km' => 2.1, 'stars' => 5, 'source' => 'Booking.com'])
            ->assertCreated()->assertJsonFragment(['hotel' => 'The Westin']);

        $this->postJson('/api/competitor-rates', ['competitorId' => 'westin', 'date' => '2026-06-16', 'roomType' => 'STD', 'rate' => 8200])
            ->assertCreated();
        $this->postJson('/api/competitor-rates', ['competitorId' => 'trident', 'date' => '2026-06-16', 'roomType' => 'STD', 'rate' => 7600]);

        $this->getJson('/api/competitor-rates?competitorId=westin')->assertOk()->assertJsonCount(1);
    }
```

- [ ] **Step 2: Run, verify it fails**

Run: `C:/php84/php.exe artisan test --filter test_competitors_and_rates_crud`
Expected: FAIL.

- [ ] **Step 3: Create migrations**

`2026_06_16_000004_create_competitors_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competitors', function (Blueprint $t) {
            $t->id();
            $t->string('hotel')->default('');
            $t->string('brand')->nullable();
            $t->decimal('km', 6, 2)->default(0);
            $t->integer('stars')->default(3);
            $t->string('source')->default('');     // Booking.com | Agoda | ...
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competitors');
    }
};
```

`2026_06_16_000005_create_competitor_rates_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competitor_rates', function (Blueprint $t) {
            $t->id();
            $t->string('competitorId')->index();   // slug, e.g. westin
            $t->string('date')->default('');        // YYYY-MM-DD
            $t->string('roomType')->default('');
            $t->integer('rate')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competitor_rates');
    }
};
```

- [ ] **Step 4: Create models**

`app/Models/Competitor.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Competitor extends Model {
    protected $guarded = ['id'];
    protected $casts = ['km' => 'float', 'stars' => 'integer', 'active' => 'boolean'];
}
```
`app/Models/CompetitorRate.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class CompetitorRate extends Model {
    protected $table = 'competitor_rates';
    protected $guarded = ['id'];
    protected $casts = ['rate' => 'integer'];
}
```

- [ ] **Step 5: Register both resources**

In `ResourceController.php`: add `use App\Models\Competitor;` and `use App\Models\CompetitorRate;`. Add to `MODELS`:
```php
        'competitors'      => Competitor::class,
        'competitor-rates' => CompetitorRate::class,
```
Add to `FILTER_BY`: `'competitor-rates' => 'competitorId',`. Add to `RULES`:
```php
        'competitors' => [
            'hotel' => 'string|max:255', 'brand' => 'string|max:255', 'km' => 'numeric|min:0',
            'stars' => 'integer|min:1|max:5', 'source' => 'string|max:100', 'active' => 'boolean',
        ],
        'competitor-rates' => [
            'competitorId' => 'string|max:50', 'date' => 'string|max:50',
            'roomType' => 'string|max:50', 'rate' => 'integer|min:0',
        ],
```
Add to `REQUIRED_ON_CREATE`:
```php
        'competitors' => ['hotel'],
        'competitor-rates' => ['competitorId', 'rate'],
```

- [ ] **Step 6: Run, verify it passes**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_16_000004_create_competitors_table.php hotel-pms-api/database/migrations/2026_06_16_000005_create_competitor_rates_table.php hotel-pms-api/app/Models/Competitor.php hotel-pms-api/app/Models/CompetitorRate.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/MockToLiveTest.php
git commit -m "feat(revenue): competitors + competitor-rates resources"
```

---

## Task 11: Competitor Rate Shop — seeder

**Files:**
- Create: `hotel-pms-api/database/seeders/CompetitorSeeder.php`
- Modify: `hotel-pms-api/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create the seeder**

Seed the 5 competitors currently hardcoded in `comp-shop/page.tsx` (`westin`, `trident`, `sahara`, `hyatt`, `sofitel`) plus a small window of rates. Use the slug as a stable key. Read the exact hotel names/brands/km/stars/base rates from `comp-shop/page.tsx` (COMP_IDS, the competitor objects, and the `BASE` rate map) and transcribe them here.

```php
<?php

namespace Database\Seeders;

use App\Models\Competitor;
use App\Models\CompetitorRate;
use Illuminate\Database\Seeder;

class CompetitorSeeder extends Seeder
{
    public function run(): void
    {
        // hotel, brand, km, stars, source, base STD rate — transcribe from comp-shop/page.tsx
        $comps = [
            ['slug' => 'westin',  'hotel' => 'The Westin',        'brand' => 'Marriott', 'km' => 2.1, 'stars' => 5, 'source' => 'Booking.com', 'base' => 8200],
            ['slug' => 'trident', 'hotel' => 'Trident',           'brand' => 'Oberoi',   'km' => 3.4, 'stars' => 5, 'source' => 'Agoda',       'base' => 7600],
            ['slug' => 'sahara',  'hotel' => 'Sahara Star',       'brand' => 'Sahara',   'km' => 1.2, 'stars' => 4, 'source' => 'MakeMyTrip',  'base' => 6400],
            ['slug' => 'hyatt',   'hotel' => 'Grand Hyatt',       'brand' => 'Hyatt',    'km' => 4.0, 'stars' => 5, 'source' => 'Booking.com', 'base' => 8800],
            ['slug' => 'sofitel', 'hotel' => 'Sofitel',           'brand' => 'Accor',    'km' => 5.1, 'stars' => 5, 'source' => 'Expedia',     'base' => 9100],
        ];
        $roomTypes = ['STD', 'DLX', 'STE', 'VLA'];

        foreach ($comps as $c) {
            Competitor::firstOrCreate(['hotel' => $c['hotel']], [
                'brand' => $c['brand'], 'km' => $c['km'], 'stars' => $c['stars'],
                'source' => $c['source'], 'active' => true,
            ]);
            // 14-day rate window, simple weekend uplift, per room type.
            foreach ($roomTypes as $i => $rt) {
                for ($d = 0; $d < 14; $d++) {
                    $date = date('Y-m-d', strtotime("2026-06-16 +$d day"));
                    $weekend = in_array((int) date('N', strtotime($date)), [6, 7], true) ? 1.15 : 1.0;
                    CompetitorRate::firstOrCreate(
                        ['competitorId' => $c['slug'], 'date' => $date, 'roomType' => $rt],
                        ['rate' => (int) round(($c['base'] + $i * 1500) * $weekend)],
                    );
                }
            }
        }
    }
}
```

- [ ] **Step 2: Register in DatabaseSeeder**

Add `CompetitorSeeder::class,` to the `$this->call([...])` array (after `PricingRuleSeeder::class,`).

- [ ] **Step 3: Run the seeder**

Run: `C:/php84/php.exe artisan db:seed --class=CompetitorSeeder`
Expected: completes; re-running does not duplicate.

- [ ] **Step 4: Commit**

```bash
git add hotel-pms-api/database/seeders/CompetitorSeeder.php hotel-pms-api/database/seeders/DatabaseSeeder.php
git commit -m "feat(revenue): seed competitors + rates"
```

---

## Task 12: Competitor Rate Shop — frontend wiring

**Files:**
- Modify: `luxe-pms/src/app/(app)/revenue/comp-shop/page.tsx`

- [ ] **Step 1: Read the file + Next docs**

Read `comp-shop/page.tsx` (973 lines) and note where `YOU`, `COMP_IDS`, the competitor objects, `ROOM_TYPES`, `BASE`/`rate()` are consumed.

- [ ] **Step 2: Add `apiGet`/`apiPost`/`apiDelete` imports**

Add at the top: `import { apiGet, apiPost, apiDelete } from "@/lib/api";`

- [ ] **Step 3: Load competitors + rates**

```tsx
  type Competitor = { id: number; hotel: string; brand?: string; km: number; stars: number; source: string; active: boolean };
  type CompRate = { id: number; competitorId: string; date: string; roomType: string; rate: number };
  const [competitors, setCompetitors] = React.useState<Competitor[]>([]);
  const [compRates, setCompRates] = React.useState<CompRate[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Competitor[]>("/competitors").then(r => { if (!cancelled) setCompetitors(r); }).catch(() => {});
    apiGet<CompRate[]>("/competitor-rates").then(r => { if (!cancelled) setCompRates(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
```

- [ ] **Step 4: Replace mock-derived rate lookups**

Replace the hardcoded `BASE`/`rate(hotelId, dayIdx)` and per-room-type columns with lookups into `compRates` (match on `competitorId` slug + `date`/`roomType`). Replace the hardcoded competitor list (`COMP_IDS` + objects) with `competitors`. For the slug, derive from hotel name or add a `slug` to the seeded data and surface it via the API (simplest: match by lowercased first word of `hotel`). Keep the existing chart/table layout; only the data source changes.

- [ ] **Step 5: Make "Add competitor" persist + "Re-scrape" honest**

The existing "Add competitor" modal should `apiPost("/competitors", {...})` and append the returned row. Relabel the "Force-rescrape"/"Re-scrape" buttons to "Refresh" and have them re-run the two `apiGet`s (no live OTA scrape). Add a one-line caption: `Rates are manually entered / imported — not live-scraped`.

- [ ] **Step 6: Build**

Run (from `luxe-pms/`): `npm run build`
Expected: compiles; no remaining reference to removed `BASE`/`COMP_IDS` mock.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/revenue/comp-shop/page.tsx"
git commit -m "feat(revenue): competitor rate shop reads/writes API"
```

---

## Task 13: Group Pricing — meal-plans resource + seeder

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_16_000006_create_meal_plans_table.php`
- Create: `hotel-pms-api/app/Models/MealPlan.php`
- Create: `hotel-pms-api/database/seeders/MealPlanSeeder.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`
- Modify: `hotel-pms-api/database/seeders/DatabaseSeeder.php`
- Modify: `hotel-pms-api/tests/Feature/MockToLiveTest.php`

- [ ] **Step 1: Write the failing test**

Add to `MockToLiveTest`:
```php
    public function test_meal_plans_crud(): void
    {
        $this->postJson('/api/meal-plans', ['code' => 'CP', 'name' => 'Continental (CP)', 'perPaxPerDay' => 950, 'desc' => 'Breakfast only'])
            ->assertCreated()->assertJsonFragment(['code' => 'CP']);
        $this->getJson('/api/meal-plans')->assertOk()->assertJsonFragment(['perPaxPerDay' => 950]);
    }
```

- [ ] **Step 2: Run, verify it fails**

Run: `C:/php84/php.exe artisan test --filter test_meal_plans_crud`
Expected: FAIL.

- [ ] **Step 3: Create migration**

`2026_06_16_000006_create_meal_plans_table.php`:
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_plans', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');         // EP | CP | MAP | AP | BQ
            $t->string('name')->default('');
            $t->integer('perPaxPerDay')->default(0);
            $t->string('desc')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_plans');
    }
};
```

- [ ] **Step 4: Create model**

`app/Models/MealPlan.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class MealPlan extends Model {
    protected $table = 'meal_plans';
    protected $guarded = ['id'];
    protected $casts = ['perPaxPerDay' => 'integer', 'active' => 'boolean'];
}
```

- [ ] **Step 5: Register resource**

In `ResourceController.php`: add `use App\Models\MealPlan;`; add `'meal-plans' => MealPlan::class,` to `MODELS`; add to `RULES`:
```php
        'meal-plans' => [
            'code' => 'string|max:20', 'name' => 'string|max:255',
            'perPaxPerDay' => 'integer|min:0', 'desc' => 'string|max:500', 'active' => 'boolean',
        ],
```
add to `REQUIRED_ON_CREATE`: `'meal-plans' => ['code', 'name'],`.

- [ ] **Step 6: Create the seeder**

`database/seeders/MealPlanSeeder.php` — transcribe `FB_PLANS` from `group-quote/page.tsx`:
```php
<?php

namespace Database\Seeders;

use App\Models\MealPlan;
use Illuminate\Database\Seeder;

class MealPlanSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'EP',  'name' => 'Rooms only (EP)',  'perPaxPerDay' => 0,    'desc' => 'No meals included'],
            ['code' => 'CP',  'name' => 'Continental (CP)', 'perPaxPerDay' => 950,  'desc' => 'Breakfast only'],
            ['code' => 'MAP', 'name' => 'Half board (MAP)', 'perPaxPerDay' => 1650, 'desc' => 'Breakfast + 1 meal'],
            ['code' => 'AP',  'name' => 'Full board (AP)',  'perPaxPerDay' => 2400, 'desc' => 'Breakfast + lunch + dinner'],
        ];
        foreach ($rows as $r) {
            MealPlan::firstOrCreate(['code' => $r['code']], $r + ['active' => true]);
        }
    }
}
```
(Verify the exact `perPaxPerDay` numbers against `group-quote/page.tsx` FB_PLANS before committing.)

- [ ] **Step 7: Register seeder**

Add `MealPlanSeeder::class,` to `DatabaseSeeder` (after `CompetitorSeeder::class,`).

- [ ] **Step 8: Run test + seeder, verify pass**

Run: `C:/php84/php.exe artisan test --filter MockToLiveTest`
Expected: PASS.
Run: `C:/php84/php.exe artisan db:seed --class=MealPlanSeeder`
Expected: completes.

- [ ] **Step 9: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_16_000006_create_meal_plans_table.php hotel-pms-api/app/Models/MealPlan.php hotel-pms-api/database/seeders/MealPlanSeeder.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/database/seeders/DatabaseSeeder.php hotel-pms-api/tests/Feature/MockToLiveTest.php
git commit -m "feat(revenue): meal-plans resource + seeder"
```

---

## Task 14: Group Pricing — seed reused fb-packages / hall-packages

**Files:**
- Modify: `hotel-pms-api/database/seeders/SetupDataSeeder.php` (or wherever fb-packages/hall-packages are seeded — grep first)

- [ ] **Step 1: Find where fb-packages / hall-packages are seeded**

Run: `grep -rln "FbPackage\|HallPackage" hotel-pms-api/database/seeders`
Read that seeder.

- [ ] **Step 2: Ensure banquet packages + venues exist**

Compare existing seeded `fb-packages`/`hall-packages` against the hardcoded `BANQUET_PKGS` (silver/gold/platinum, `perPax`) and `BANQUET_VENUES` (name, capacity) in `group-quote/page.tsx`. Add any missing rows using `firstOrCreate` keyed on `name`:
- `fb-packages`: name=Silver/Gold/Platinum, type='Banquet', pax=1, price=`perPax`, gst as appropriate, active=true.
- `hall-packages`: name=venue name, capacity=venue capacity, pricing fields (hourly/halfDay/fullDay) from existing data or 0, active=true.

(Transcribe exact perPax/capacity numbers from `group-quote/page.tsx`.)

- [ ] **Step 3: Run the seeder, verify**

Run: `C:/php84/php.exe artisan db:seed --class=<ThatSeeder>`
Expected: completes; `GET /api/fb-packages` and `/api/hall-packages` return the banquet rows.

- [ ] **Step 4: Commit**

```bash
git add hotel-pms-api/database/seeders/
git commit -m "feat(revenue): seed banquet packages + venues for group pricing"
```

---

## Task 15: Group Pricing — frontend wiring

**Files:**
- Modify: `luxe-pms/src/app/(app)/revenue/group-quote/page.tsx`

- [ ] **Step 1: Read the file + Next docs**

Read `group-quote/page.tsx` and locate `FB_PLANS`, `BANQUET_PKGS`, `BANQUET_VENUES` and how the quote math consumes them.

- [ ] **Step 2: Load the three lists from the API**

Add `apiGet` to the existing `@/lib/api` import. Add:
```tsx
  type MealPlan = { id: number; code: string; name: string; perPaxPerDay: number; desc?: string };
  type FbPackage = { id: number; name: string; price: number };
  type HallPackage = { id: number; name: string; capacity: number };
  const [mealPlans, setMealPlans] = React.useState<MealPlan[]>([]);
  const [banquetPkgs, setBanquetPkgs] = React.useState<FbPackage[]>([]);
  const [venues, setVenues] = React.useState<HallPackage[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<MealPlan[]>("/meal-plans").then(r => { if (!cancelled) setMealPlans(r); }).catch(() => {});
    apiGet<FbPackage[]>("/fb-packages").then(r => { if (!cancelled) setBanquetPkgs(r.filter(p => ["Silver","Gold","Platinum"].includes(p.name))); }).catch(() => {});
    apiGet<HallPackage[]>("/hall-packages").then(r => { if (!cancelled) setVenues(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
```

- [ ] **Step 3: Replace the constants**

Replace `FB_PLANS` → `mealPlans` (map `perPaxPerDay`), `BANQUET_PKGS` → `banquetPkgs` (map `price` → `perPax`), `BANQUET_VENUES` → `venues`. Keep the icons by mapping name→icon locally (icons can't come from the API). Default the selected plan/package to the first loaded row once data arrives. Keep the existing client-side quote math and the `apiPost("/group-bookings", ...)` submit unchanged.

- [ ] **Step 4: Build**

Run (from `luxe-pms/`): `npm run build`
Expected: compiles; no reference to removed constants.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/revenue/group-quote/page.tsx"
git commit -m "feat(revenue): group pricing reads meal plans/packages/venues from API"
```

---

## Task 16: Full migrate + seed + test sweep

**Files:** none (verification only)

- [ ] **Step 1: Fresh migrate + seed**

Run (from `hotel-pms-api/`): `C:/php84/php.exe artisan migrate:fresh --seed`
Expected: all migrations run; all seeders complete with no error.

- [ ] **Step 2: Run the full backend test suite**

Run: `C:/php84/php.exe artisan test`
Expected: all tests pass (existing + `MockToLiveTest`).

- [ ] **Step 3: Frontend build + lint**

Run (from `luxe-pms/`): `npm run build`
Expected: compiles. Then `grep -rn "mock-data-ext" src/app/(app)/accounts/page.tsx` should no longer list the three breakdown imports.

- [ ] **Step 4: Manual smoke (with both servers running via `start-dev.ps1`)**

Verify each page shows live data and actions persist after reload:
- Folio detail: add a comp → reload → still there; click Verify KYC → badge flips; Generate e-Invoice → IRN appears; reload → persists.
- Accounts: income/expense charts + recent txn reflect `account_entries`.
- Competitor Rate Shop: add competitor → reload → persists; rates render from DB.
- Group Pricing: meal plans / banquet packages / venues populate from API.

- [ ] **Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "test: full migrate/seed/test sweep for mock-to-live features"
```

---

## Self-Review notes (addressed)

- **Spec coverage:** A→Tasks 1-3, B→Tasks 4-5, C→Tasks 6-7, D→Tasks 8-9, E→Tasks 10-12, F→Tasks 13-15; cross-cutting seeders/migrations/registration covered per task; Task 16 = full sweep.
- **Type consistency:** Backend column `description` (not `desc`) for folio-adjustments; frontend `Adjustment.description`. `meal_plans` uses `perPaxPerDay`. `competitor_rates` uses `competitorId`. e-invoice `signedJson` cast to array. These names are used consistently across tasks.
- **Stub honesty:** e-Invoice IRN labeled "locally generated, not NIC-issued" (Task 7 step 2); competitor rates labeled "manually entered, not live-scraped" (Task 12 step 5).
