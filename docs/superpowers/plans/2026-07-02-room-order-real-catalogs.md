# Room-order real catalogs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded Food & Drinks / Snacks-Minibar / Laundry / Other-services catalogs in the Room Rack "Order for Room" dialog with real, settings-editable data, so an item added in Settings shows up in the order dialog without a code change.

**Architecture:** Food & Drinks reuses the existing `/menu-items` API (already real, already has a Settings manager). Snacks/Minibar, Laundry, and Other services become one new unified backend resource `service-items` (single table, `kind` discriminator column), with a new Settings section to manage it. A pure helper (`buildOrderCatalog`) assembles the dialog's per-tab item lists from the two API responses, replacing the hardcoded `ORDER_CATALOG` object in `rack/page.tsx`; the old hardcoded data becomes the offline fallback shown until the fetch resolves.

**Tech Stack:** Laravel 11 (PHP, `hotel-pms-api`) + Postgres backend; Next.js/React (TypeScript, `luxe-pms`) frontend; PHPUnit (`artisan test`, sqlite in-memory) for backend tests; Vitest for frontend pure-logic tests. No automated React component tests exist in this repo — UI wiring is verified manually in the browser (established project convention).

## Global Constraints

- Backend PHP commands MUST use `C:\php84\php.exe` (see `pgsql-php-extension-fix` — the default `php` on PATH can't load the `pgsql` extension needed by this app). Run from the `hotel-pms-api` directory.
- Login for manual verification: `admin@hotel.com` / `password123`.
- Seeders must be idempotent (`firstOrCreate`), matching every existing seeder in this codebase, so re-running `db:seed` never duplicates rows.
- New tenant-scoped tables get `company_id` (nullable, indexed) directly in their creating migration and use the `App\Models\Concerns\BelongsToCompany` trait on the model — the convention for every table created after the 2026-06-23 multi-tenancy retrofit.
- Follow existing generic-resource conventions exactly: `ResourceController` (`MODELS`/`RULES`/`REQUIRED_ON_CREATE`/`FILTER_BY`), one settings-manager component per section, `apiGet/apiPost/apiPut/apiDelete` from `src/lib/api.ts`.
- Full design context: `docs/superpowers/specs/2026-07-02-room-order-real-catalogs-design.md`.

---

### Task 1: Backend — `service-items` resource (migration + model + ResourceController registration)

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_07_02_000000_create_service_items_table.php`
- Create: `hotel-pms-api/app/Models/ServiceItem.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`
- Test: `hotel-pms-api/tests/Feature/ServiceItemsTest.php`

**Interfaces:**
- Produces: REST resource `GET/POST/PUT/DELETE /api/service-items` (optionally `?kind=snacks|laundry|other`). Row shape: `{ id, kind, name, price, hint, active, company_id, created_at, updated_at }`. This is what Task 2 (seeder) and Task 4 (frontend fetch) consume.

- [ ] **Step 1: Write the failing feature test**

Create `hotel-pms-api/tests/Feature/ServiceItemsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceItemsTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_crud_round_trip(): void
    {
        $this->auth();

        $created = $this->postJson('/api/service-items', [
            'kind' => 'snacks', 'name' => 'Bottled water (1L)', 'price' => 100,
            'hint' => null, 'active' => true,
        ])->assertCreated()->json();

        $this->getJson('/api/service-items')->assertOk()
            ->assertJsonFragment(['name' => 'Bottled water (1L)', 'price' => 100]);

        $this->putJson("/api/service-items/{$created['id']}", ['price' => 120])
            ->assertOk()->assertJsonPath('price', 120);

        $this->deleteJson("/api/service-items/{$created['id']}")->assertNoContent();
        $this->getJson('/api/service-items')->assertOk()->assertJsonMissing(['name' => 'Bottled water (1L)']);
    }

    public function test_name_and_kind_are_required(): void
    {
        $this->auth();
        $this->postJson('/api/service-items', ['price' => 100])->assertStatus(422);
        $this->postJson('/api/service-items', ['name' => 'Iron + board', 'price' => 0])->assertStatus(422);
    }

    public function test_filters_by_kind(): void
    {
        $this->auth();

        $this->postJson('/api/service-items', ['kind' => 'snacks', 'name' => 'Chips', 'price' => 120]);
        $this->postJson('/api/service-items', ['kind' => 'laundry', 'name' => 'Shirt · wash & press', 'price' => 150]);

        $this->getJson('/api/service-items?kind=laundry')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Shirt · wash & press']);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `hotel-pms-api`): `C:\php84\php.exe artisan test --filter=ServiceItemsTest`
Expected: FAIL — `service-items` is not a registered resource yet, so every request 404s and all three tests fail.

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_07_02_000000_create_service_items_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_items', function (Blueprint $t) {
            $t->id();
            $t->string('kind')->default('');
            $t->string('name')->default('');
            $t->integer('price')->default(0);
            $t->string('hint')->nullable();
            $t->boolean('active')->default(true);
            $t->unsignedBigInteger('company_id')->nullable()->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_items');
    }
};
```

- [ ] **Step 4: Create the model**

Create `hotel-pms-api/app/Models/ServiceItem.php`:

```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class ServiceItem extends Model {
    use BelongsToCompany;
    protected $table = 'service_items';
    protected $guarded = ['id'];
    protected $casts = ['price' => 'integer', 'active' => 'boolean'];
}
```

- [ ] **Step 5: Register the resource in `ResourceController`**

In `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`, add the model import. Find:

```php
use App\Models\GroupService;
use App\Models\CashierShift;
use Illuminate\Http\Request;
```

Replace with:

```php
use App\Models\GroupService;
use App\Models\CashierShift;
use App\Models\ServiceItem;
use Illuminate\Http\Request;
```

Find the end of the `MODELS` array:

```php
        'group-services'         => GroupService::class,
        'cashier-shifts'         => CashierShift::class,
    ];
```

Replace with:

```php
        'group-services'         => GroupService::class,
        'cashier-shifts'         => CashierShift::class,
        'service-items'          => ServiceItem::class,
    ];
```

Find the end of the `FILTER_BY` array:

```php
        'maintenance-tickets' => ['status'],
        'hall-bookings'     => ['status'],
    ];
```

Replace with:

```php
        'maintenance-tickets' => ['status'],
        'hall-bookings'     => ['status'],
        'service-items'     => ['kind'],
    ];
```

Find the end of the `RULES` array:

```php
        'cashier-shifts' => [
            'staffName'      => 'string|max:255',
            'openedAt'       => 'string|max:50|nullable',
            'openingBalance' => 'integer|min:0',
            'status'         => 'string|max:50',
            'closingBalance' => 'integer|min:0|nullable',
            'closedAt'       => 'string|max:50|nullable',
            'notes'          => 'string|max:2000|nullable',
        ],
    ];
```

Replace with:

```php
        'cashier-shifts' => [
            'staffName'      => 'string|max:255',
            'openedAt'       => 'string|max:50|nullable',
            'openingBalance' => 'integer|min:0',
            'status'         => 'string|max:50',
            'closingBalance' => 'integer|min:0|nullable',
            'closedAt'       => 'string|max:50|nullable',
            'notes'          => 'string|max:2000|nullable',
        ],
        'service-items' => [
            'kind' => 'string|max:20', 'name' => 'string|max:255',
            'price' => 'integer|min:0', 'hint' => 'string|max:255|nullable', 'active' => 'boolean',
        ],
    ];
```

Find the end of the `REQUIRED_ON_CREATE` array:

```php
        'group-services'  => ['name'],
        'cashier-shifts'  => ['staffName'],
    ];
```

Replace with:

```php
        'group-services'  => ['name'],
        'cashier-shifts'  => ['staffName'],
        'service-items'   => ['name', 'kind'],
    ];
```

- [ ] **Step 6: Run the test to verify it passes**

Run (from `hotel-pms-api`): `C:\php84\php.exe artisan test --filter=ServiceItemsTest`
Expected: PASS — 3 tests, all green.

- [ ] **Step 7: Apply the migration to the local dev database**

Run (from `hotel-pms-api`): `C:\php84\php.exe artisan migrate --force`
Expected: output includes `2026_07_02_000000_create_service_items_table ... DONE`.

- [ ] **Step 8: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_07_02_000000_create_service_items_table.php hotel-pms-api/app/Models/ServiceItem.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/ServiceItemsTest.php
git commit -m "feat(api): add service-items resource for snacks/laundry/other-services catalogs"
```

---

### Task 2: Backend — seed the 3 catalogs from the current hardcoded data

**Files:**
- Create: `hotel-pms-api/database/seeders/ServiceItemSeeder.php`
- Modify: `hotel-pms-api/database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Consumes: `App\Models\ServiceItem` (Task 1).
- Produces: 26 seeded rows (10 `snacks`, 8 `laundry`, 8 `other`) available at `GET /api/service-items` — the starting data Task 4/5 will see.

- [ ] **Step 1: Create the seeder**

Create `hotel-pms-api/database/seeders/ServiceItemSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\ServiceItem;
use Illuminate\Database\Seeder;

/**
 * Room-service catalogs for the Room Rack "Order for Room" dialog — Snacks/
 * Minibar, Laundry, and Other services. Editable in Configuration → Room
 * Service & Requests. Transcribed from the former hardcoded ORDER_CATALOG
 * in rack/page.tsx.
 */
class ServiceItemSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // Snacks / Minibar
            ['kind' => 'snacks', 'name' => 'Bottled water (1L)', 'price' => 100],
            ['kind' => 'snacks', 'name' => 'Coca-Cola 330ml', 'price' => 150],
            ['kind' => 'snacks', 'name' => 'Lays / Chips pack', 'price' => 120],
            ['kind' => 'snacks', 'name' => 'Snickers / Mars bar', 'price' => 150],
            ['kind' => 'snacks', 'name' => 'Mixed nuts (200g)', 'price' => 350],
            ['kind' => 'snacks', 'name' => 'Coffee pod (Nespresso)', 'price' => 180],
            ['kind' => 'snacks', 'name' => 'Tea bags (assorted)', 'price' => 80],
            ['kind' => 'snacks', 'name' => 'Beer · Kingfisher 330ml', 'price' => 350],
            ['kind' => 'snacks', 'name' => 'Wine · House 187ml', 'price' => 650],
            ['kind' => 'snacks', 'name' => 'Whiskey · Single peg 30ml', 'price' => 450],

            // Laundry
            ['kind' => 'laundry', 'name' => 'Shirt · wash & press', 'price' => 150],
            ['kind' => 'laundry', 'name' => 'Trousers / Jeans', 'price' => 180],
            ['kind' => 'laundry', 'name' => 'Dress / Saree', 'price' => 250],
            ['kind' => 'laundry', 'name' => 'Suit / Jacket (dry-clean)', 'price' => 400],
            ['kind' => 'laundry', 'name' => 'Inner wear / Socks', 'price' => 80],
            ['kind' => 'laundry', 'name' => 'Pyjamas / Nightwear', 'price' => 150],
            ['kind' => 'laundry', 'name' => 'Bedsheet / Pillow cover', 'price' => 200],
            ['kind' => 'laundry', 'name' => 'Express (same-day) — surcharge', 'price' => 250, 'hint' => '+ 50% on items'],

            // Other services
            ['kind' => 'other', 'name' => 'Wake-up call (set time below)', 'price' => 0],
            ['kind' => 'other', 'name' => 'Newspaper delivery', 'price' => 0, 'hint' => 'Free · daily'],
            ['kind' => 'other', 'name' => 'Spa booking — 60 min', 'price' => 3500],
            ['kind' => 'other', 'name' => 'Airport drop (sedan)', 'price' => 1800],
            ['kind' => 'other', 'name' => 'Doctor on call', 'price' => 2000],
            ['kind' => 'other', 'name' => 'Babysitting (per hour)', 'price' => 800],
            ['kind' => 'other', 'name' => 'Iron + board to room', 'price' => 0, 'hint' => 'Free'],
            ['kind' => 'other', 'name' => 'Extra towels / amenities', 'price' => 0, 'hint' => 'Free'],
        ];

        foreach ($rows as $r) {
            ServiceItem::firstOrCreate(
                ['kind' => $r['kind'], 'name' => $r['name']],
                $r + ['hint' => null, 'active' => true]
            );
        }
    }
}
```

- [ ] **Step 2: Register it in `DatabaseSeeder`**

In `hotel-pms-api/database/seeders/DatabaseSeeder.php`, find:

```php
            GroupServiceSeeder::class,
        ]);
```

Replace with:

```php
            GroupServiceSeeder::class,
            ServiceItemSeeder::class,
        ]);
```

- [ ] **Step 3: Run the seeder against the local dev database**

Run (from `hotel-pms-api`): `C:\php84\php.exe artisan db:seed --class=ServiceItemSeeder --force`
Expected: no errors (idempotent — safe to re-run).

- [ ] **Step 4: Verify the row counts**

Run (from `hotel-pms-api`):
```
C:\php84\php.exe artisan tinker --execute="echo App\Models\ServiceItem::count().' total, '.App\Models\ServiceItem::where('kind','snacks')->count().' snacks, '.App\Models\ServiceItem::where('kind','laundry')->count().' laundry, '.App\Models\ServiceItem::where('kind','other')->count().' other'.PHP_EOL;"
```
Expected output: `26 total, 10 snacks, 8 laundry, 8 other`

- [ ] **Step 5: Commit**

```bash
git add hotel-pms-api/database/seeders/ServiceItemSeeder.php hotel-pms-api/database/seeders/DatabaseSeeder.php
git commit -m "feat(api): seed service-items with the current snacks/laundry/other-services catalog"
```

---

### Task 3: Frontend — pure `order-catalog` helper (TDD)

**Files:**
- Create: `luxe-pms/src/lib/order-catalog.ts`
- Test: `luxe-pms/src/lib/order-catalog.test.ts`

**Interfaces:**
- Produces: `OrderTab` (type), `OrderCatalogItem` (type: `{id: string; name: string; price: number; hint?: string}`), `MenuItemRow` (type), `ServiceItemRow` (type), `FALLBACK_ORDER_CATALOG: Record<OrderTab, OrderCatalogItem[]>`, `buildOrderCatalog(menuItems: MenuItemRow[], serviceItems: ServiceItemRow[]): Record<OrderTab, OrderCatalogItem[]>`. Task 4 imports all five names from this module.

- [ ] **Step 1: Write the failing tests**

Create `luxe-pms/src/lib/order-catalog.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildOrderCatalog, FALLBACK_ORDER_CATALOG } from "./order-catalog";

describe("buildOrderCatalog", () => {
  it("maps menu items into the food tab", () => {
    const catalog = buildOrderCatalog(
      [{ id: 3, name: "Butter Chicken", price: 540 }],
      [],
    );
    expect(catalog.food).toEqual([{ id: "menu-3", name: "Butter Chicken", price: 540 }]);
  });

  it("groups service items into snacks/laundry/other by kind", () => {
    const catalog = buildOrderCatalog([], [
      { id: 1, kind: "snacks", name: "Chips", price: 120, active: true },
      { id: 2, kind: "laundry", name: "Shirt", price: 150, hint: null, active: true },
      { id: 3, kind: "other", name: "Spa", price: 3500, active: true },
    ]);
    expect(catalog.snacks).toEqual([{ id: "svc-1", name: "Chips", price: 120, hint: undefined }]);
    expect(catalog.laundry).toEqual([{ id: "svc-2", name: "Shirt", price: 150, hint: undefined }]);
    expect(catalog.other).toEqual([{ id: "svc-3", name: "Spa", price: 3500, hint: undefined }]);
  });

  it("carries the hint through when present", () => {
    const catalog = buildOrderCatalog([], [
      { id: 8, kind: "laundry", name: "Express", price: 250, hint: "+ 50% on items", active: true },
    ]);
    expect(catalog.laundry[0].hint).toBe("+ 50% on items");
  });

  it("drops inactive service items", () => {
    const catalog = buildOrderCatalog([], [
      { id: 1, kind: "snacks", name: "Discontinued", price: 100, active: false },
    ]);
    expect(catalog.snacks).toEqual([]);
  });

  it("keeps menu-item ids and service-item ids from colliding", () => {
    const catalog = buildOrderCatalog(
      [{ id: 5, name: "Pizza", price: 650 }],
      [{ id: 5, kind: "snacks", name: "Chips", price: 120, active: true }],
    );
    expect(catalog.food[0].id).not.toBe(catalog.snacks[0].id);
  });

  it("the fallback catalog has all 4 tabs non-empty", () => {
    expect(FALLBACK_ORDER_CATALOG.food.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_CATALOG.snacks.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_CATALOG.laundry.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_CATALOG.other.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `luxe-pms`): `npm test -- src/lib/order-catalog.test.ts`
Expected: FAIL — cannot resolve module `./order-catalog` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `luxe-pms/src/lib/order-catalog.ts`:

```typescript
// Pure catalog-building logic for the Room Rack "Order for Room" dialog —
// separated from rack/page.tsx so it's unit-testable without React/DOM.

export type OrderTab = "food" | "snacks" | "laundry" | "other";

export type OrderCatalogItem = {
  id: string;
  name: string;
  price: number;
  hint?: string;
};

export type MenuItemRow = { id: number | string; name: string; price: number };
export type ServiceItemRow = {
  id: number | string;
  kind: string;
  name: string;
  price: number;
  hint?: string | null;
  active?: boolean;
};

const SERVICE_TABS: Exclude<OrderTab, "food">[] = ["snacks", "laundry", "other"];

// Hardcoded catalog shown until the real /menu-items + /service-items fetch
// resolves (or if it fails) — the project's established offline-fallback
// pattern.
export const FALLBACK_ORDER_CATALOG: Record<OrderTab, OrderCatalogItem[]> = {
  food: [
    { id: "f1", name: "Continental Breakfast", price: 450, hint: "Eggs · juice · toast" },
    { id: "f2", name: "Eggs Benedict", price: 380 },
    { id: "f3", name: "Caesar Salad", price: 320 },
    { id: "f4", name: "Wagyu Burger", price: 850 },
    { id: "f5", name: "Grilled Salmon", price: 1200 },
    { id: "f6", name: "Margherita Pizza", price: 650 },
    { id: "f7", name: "Penne Arrabbiata", price: 480 },
    { id: "f8", name: "Tiramisu", price: 280 },
  ],
  snacks: [
    { id: "s1", name: "Bottled water (1L)", price: 100 },
    { id: "s2", name: "Coca-Cola 330ml", price: 150 },
    { id: "s3", name: "Lays / Chips pack", price: 120 },
    { id: "s4", name: "Snickers / Mars bar", price: 150 },
    { id: "s5", name: "Mixed nuts (200g)", price: 350 },
    { id: "s6", name: "Coffee pod (Nespresso)", price: 180 },
    { id: "s7", name: "Tea bags (assorted)", price: 80 },
    { id: "s8", name: "Beer · Kingfisher 330ml", price: 350 },
    { id: "s9", name: "Wine · House 187ml", price: 650 },
    { id: "s10", name: "Whiskey · Single peg 30ml", price: 450 },
  ],
  laundry: [
    { id: "l1", name: "Shirt · wash & press", price: 150 },
    { id: "l2", name: "Trousers / Jeans", price: 180 },
    { id: "l3", name: "Dress / Saree", price: 250 },
    { id: "l4", name: "Suit / Jacket (dry-clean)", price: 400 },
    { id: "l5", name: "Inner wear / Socks", price: 80 },
    { id: "l6", name: "Pyjamas / Nightwear", price: 150 },
    { id: "l7", name: "Bedsheet / Pillow cover", price: 200 },
    { id: "l8", name: "Express (same-day) — surcharge", price: 250, hint: "+ 50% on items" },
  ],
  other: [
    { id: "o1", name: "Wake-up call (set time below)", price: 0 },
    { id: "o2", name: "Newspaper delivery", price: 0, hint: "Free · daily" },
    { id: "o3", name: "Spa booking — 60 min", price: 3500 },
    { id: "o4", name: "Airport drop (sedan)", price: 1800 },
    { id: "o5", name: "Doctor on call", price: 2000 },
    { id: "o6", name: "Babysitting (per hour)", price: 800 },
    { id: "o7", name: "Iron + board to room", price: 0, hint: "Free" },
    { id: "o8", name: "Extra towels / amenities", price: 0, hint: "Free" },
  ],
};

// Builds the dialog's per-tab item lists from live API data. IDs are
// prefixed by source table ("menu-" / "svc-") because /menu-items and
// /service-items are separate auto-increment tables — without the prefix,
// a menu item and a service item could share the same numeric id and
// collide in the dialog's flat cart lookup (ALL_ITEMS.find(id)).
export function buildOrderCatalog(
  menuItems: MenuItemRow[],
  serviceItems: ServiceItemRow[],
): Record<OrderTab, OrderCatalogItem[]> {
  const food: OrderCatalogItem[] = menuItems.map(m => ({
    id: `menu-${m.id}`, name: m.name, price: m.price,
  }));

  const catalog: Record<OrderTab, OrderCatalogItem[]> = { food, snacks: [], laundry: [], other: [] };
  for (const tab of SERVICE_TABS) {
    catalog[tab] = serviceItems
      .filter(s => s.kind === tab && s.active !== false)
      .map(s => ({ id: `svc-${s.id}`, name: s.name, price: s.price, hint: s.hint ?? undefined }));
  }
  return catalog;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `luxe-pms`): `npm test -- src/lib/order-catalog.test.ts`
Expected: PASS — 6 tests, all green.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/order-catalog.ts luxe-pms/src/lib/order-catalog.test.ts
git commit -m "feat(luxe-pms): add pure order-catalog builder for the room-order dialog"
```

---

### Task 4: Frontend — wire the Room Rack Order dialog to real catalogs

**Files:**
- Modify: `luxe-pms/src/app/(app)/rack/page.tsx`

**Interfaces:**
- Consumes: `buildOrderCatalog`, `FALLBACK_ORDER_CATALOG`, `OrderCatalogItem`, `OrderTab`, `MenuItemRow`, `ServiceItemRow` from `@/lib/order-catalog` (Task 3). `apiGet` from `@/lib/api` (already imported in this file).

- [ ] **Step 1: Import the new helper and remove the local `OrderTab` type**

Find (near the top of the file, in the import block):

```typescript
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";
```

Replace with:

```typescript
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { buildOrderCatalog, FALLBACK_ORDER_CATALOG } from "@/lib/order-catalog";
import type { OrderCatalogItem, OrderTab, MenuItemRow, ServiceItemRow } from "@/lib/order-catalog";
import { GuestDetailDrawer } from "@/components/guests/guest-detail-drawer";
```

Find (inside `ActionDialog`, where the order tab state is declared):

```typescript
  // Order — tab + cart
  type OrderTab = "food" | "snacks" | "laundry" | "other";
  const [orderTab, setOrderTab] = React.useState<OrderTab>("food");
```

Replace with:

```typescript
  // Order — tab + cart
  const [orderTab, setOrderTab] = React.useState<OrderTab>("food");
```

- [ ] **Step 2: Replace the hardcoded `ORDER_CATALOG` with fetched state**

Find this entire block (the hardcoded catalog through the `ALL_ITEMS` line):

```typescript
  const ORDER_CATALOG: Record<OrderTab, { id: string; name: string; price: number; hint?: string }[]> = {
    food: [
      { id: "f1", name: "Continental Breakfast", price: 450, hint: "Eggs · juice · toast" },
      { id: "f2", name: "Eggs Benedict", price: 380 },
      { id: "f3", name: "Caesar Salad", price: 320 },
      { id: "f4", name: "Wagyu Burger", price: 850 },
      { id: "f5", name: "Grilled Salmon", price: 1200 },
      { id: "f6", name: "Margherita Pizza", price: 650 },
      { id: "f7", name: "Penne Arrabbiata", price: 480 },
      { id: "f8", name: "Tiramisu", price: 280 },
    ],
    snacks: [
      { id: "s1", name: "Bottled water (1L)", price: 100 },
      { id: "s2", name: "Coca-Cola 330ml", price: 150 },
      { id: "s3", name: "Lays / Chips pack", price: 120 },
      { id: "s4", name: "Snickers / Mars bar", price: 150 },
      { id: "s5", name: "Mixed nuts (200g)", price: 350 },
      { id: "s6", name: "Coffee pod (Nespresso)", price: 180 },
      { id: "s7", name: "Tea bags (assorted)", price: 80 },
      { id: "s8", name: "Beer · Kingfisher 330ml", price: 350 },
      { id: "s9", name: "Wine · House 187ml", price: 650 },
      { id: "s10", name: "Whiskey · Single peg 30ml", price: 450 },
    ],
    laundry: [
      { id: "l1", name: "Shirt · wash & press", price: 150 },
      { id: "l2", name: "Trousers / Jeans", price: 180 },
      { id: "l3", name: "Dress / Saree", price: 250 },
      { id: "l4", name: "Suit / Jacket (dry-clean)", price: 400 },
      { id: "l5", name: "Inner wear / Socks", price: 80 },
      { id: "l6", name: "Pyjamas / Nightwear", price: 150 },
      { id: "l7", name: "Bedsheet / Pillow cover", price: 200 },
      { id: "l8", name: "Express (same-day) — surcharge", price: 250, hint: "+ 50% on items" },
    ],
    other: [
      { id: "o1", name: "Wake-up call (set time below)", price: 0 },
      { id: "o2", name: "Newspaper delivery", price: 0, hint: "Free · daily" },
      { id: "o3", name: "Spa booking — 60 min", price: 3500 },
      { id: "o4", name: "Airport drop (sedan)", price: 1800 },
      { id: "o5", name: "Doctor on call", price: 2000 },
      { id: "o6", name: "Babysitting (per hour)", price: 800 },
      { id: "o7", name: "Iron + board to room", price: 0, hint: "Free" },
      { id: "o8", name: "Extra towels / amenities", price: 0, hint: "Free" },
    ],
  };

  const ALL_ITEMS = [...ORDER_CATALOG.food, ...ORDER_CATALOG.snacks, ...ORDER_CATALOG.laundry, ...ORDER_CATALOG.other];
```

Replace with:

```typescript
  const [orderCatalog, setOrderCatalog] = React.useState<Record<OrderTab, OrderCatalogItem[]>>(FALLBACK_ORDER_CATALOG);

  // Load the real, settings-editable catalogs once when an order dialog
  // opens; keep showing the hardcoded fallback until they resolve (or if
  // the API is unreachable).
  React.useEffect(() => {
    if (kind !== "order") return;
    let cancelled = false;
    Promise.all([
      apiGet<MenuItemRow[]>("/menu-items"),
      apiGet<ServiceItemRow[]>("/service-items"),
    ]).then(([menuItems, serviceItems]) => {
      if (!cancelled) setOrderCatalog(buildOrderCatalog(menuItems, serviceItems));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [kind]);

  const ALL_ITEMS = [...orderCatalog.food, ...orderCatalog.snacks, ...orderCatalog.laundry, ...orderCatalog.other];
```

- [ ] **Step 3: Update the two remaining `ORDER_CATALOG` references**

Find:

```typescript
                    const count = ORDER_CATALOG[t.id].reduce((c, it) => c + (orderCart[it.id] ?? 0), 0);
```

Replace with:

```typescript
                    const count = orderCatalog[t.id].reduce((c, it) => c + (orderCart[it.id] ?? 0), 0);
```

Find:

```typescript
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
                  {ORDER_CATALOG[orderTab].map(it => {
```

Replace with:

```typescript
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1">
                  {orderCatalog[orderTab].map(it => {
```

- [ ] **Step 4: Type-check**

Run (from `luxe-pms`): `npx tsc --noEmit`
Expected: no errors referencing `rack/page.tsx` or `order-catalog.ts`.

- [ ] **Step 5: Manual browser verification**

1. Start the dev servers: from the repo root, `powershell -File start-dev.ps1` (or, if already running, ensure the backend is the `C:\php84\php.exe` one per `pgsql-php-extension-fix`).
2. Log in at the frontend URL with `admin@hotel.com` / `password123`.
3. Go to Room Rack, open an occupied room, click **Order**.
4. Confirm the **Food & Drinks** tab shows the real menu (matches Settings → Menu Items — not "Continental Breakfast / Eggs Benedict / Caesar Salad / Wagyu Burger / Grilled Salmon" verbatim, unless those happen to be seeded menu items too).
5. Confirm **Snacks/Minibar**, **Laundry**, **Other services** each show 10/8/8 items matching the `ServiceItemSeeder` data from Task 2.
6. Add a quantity to an item in each tab, confirm the cart subtotal/tax/total update and "Send to kitchen/laundry/concierge" label switches per tab.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/rack/page.tsx"
git commit -m "feat(luxe-pms): wire the room-order dialog to real menu-items and service-items"
```

---

### Task 5: Frontend — Settings "Room Service & Requests" manager

**Files:**
- Create: `luxe-pms/src/app/(app)/setup/service-items-manager.tsx`
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`

**Interfaces:**
- Consumes: `apiGet/apiPost/apiPut/apiDelete` (`@/lib/api`), `Switch` (`@/components/ui/switch`, props `{checked: boolean; onChange?: (next: boolean) => void}`), `money` (`@/lib/utils`), REST resource `/service-items` (Task 1).
- Produces: `ServiceItemsManager` component, imported and rendered by `setup-view.tsx`.

- [ ] **Step 1: Create the manager component**

Create `luxe-pms/src/app/(app)/setup/service-items-manager.tsx`:

```tsx
"use client";
import * as React from "react";
import { Plus, Edit, Trash2, ConciergeBell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Row = { id: number | string; kind: string; name: string; price: number; hint: string | null; active: boolean };
type Kind = "snacks" | "laundry" | "other";
const KIND_TABS: { id: Kind; label: string }[] = [
  { id: "snacks", label: "Snacks / Minibar" },
  { id: "laundry", label: "Laundry" },
  { id: "other", label: "Other services" },
];
const blank = (kind: Kind): Row => ({ id: "", kind, name: "", price: 0, hint: "", active: true });

export function ServiceItemsManager({ onToast }: { onToast?: (m: string) => void }) {
  const [activeKind, setActiveKind] = React.useState<Kind>("snacks");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: Row } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<Row | null>(null);
  const toast = (m: string) => onToast?.(m);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>("/service-items").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const visible = rows.filter(r => r.kind === activeKind);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    const row = dialog.row;
    const body = { kind: row.kind, name: row.name.trim(), price: row.price, hint: row.hint?.trim() || null, active: row.active };
    try {
      if (dialog.mode === "edit") {
        const updated = await apiPut<Row>(`/service-items/${row.id}`, body);
        setRows(rs => rs.map(r => (r.id === row.id ? { ...r, ...updated } : r)));
        toast(`${body.name} updated`);
      } else {
        const created = await apiPost<Row>("/service-items", body);
        setRows(rs => [created, ...rs]);
        toast(`${body.name} added`);
      }
      setDialog(null);
    } catch {
      toast("⚠ Couldn't save — backend offline");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    setConfirmDelete(null);
    try {
      await apiDelete(`/service-items/${row.id}`);
      setRows(rs => rs.filter(r => r.id !== row.id));
      toast(`${row.name} removed`);
    } catch {
      toast("⚠ Couldn't delete — backend offline");
    }
  };

  const setActive = async (row: Row, next: boolean) => {
    setRows(rs => rs.map(r => (r.id === row.id ? { ...r, active: next } : r)));
    try {
      await apiPut(`/service-items/${row.id}`, { active: next });
    } catch {
      setRows(rs => rs.map(r => (r.id === row.id ? { ...r, active: !next } : r)));
      toast("⚠ Couldn't update — backend offline");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><ConciergeBell className="h-4 w-4 text-accent" />Room Service & Requests</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} items across snacks, laundry & other services</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create", row: blank(activeKind) })}>
          <Plus className="h-4 w-4" />Add item
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {KIND_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveKind(t.id)}
            className={`h-9 rounded-md border text-xs font-medium transition-colors ${activeKind === t.id ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
          No items yet. Click &quot;Add item&quot; to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map(row => (
            <Card key={row.id} className="p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{row.name}</p>
                <span className="text-sm font-semibold tabular text-brand shrink-0">{row.price === 0 ? "Free" : money(row.price)}</span>
              </div>
              {row.hint && <p className="text-xs text-muted-foreground italic">{row.hint}</p>}
              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Switch checked={row.active} onChange={next => setActive(row, next)} />
                  {row.active ? "Active" : "Hidden"}
                </label>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setDialog({ mode: "edit", row })}>
                    <Edit className="h-3 w-3" />Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}>
                    <Trash2 className="h-3 w-3" />Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">{dialog.mode === "edit" ? "Edit item" : "Add item"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{KIND_TABS.find(t => t.id === dialog.row.kind)?.label}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={dialog.row.name} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, name: e.target.value } }))} className="h-9" placeholder="Bottled water (1L)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹, 0 = complimentary)</Label>
                <Input type="number" min={0} value={dialog.row.price} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, price: Number(e.target.value) } }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Note (optional)</Label>
                <Input value={dialog.row.hint ?? ""} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, hint: e.target.value } }))} className="h-9" placeholder="+ 50% on items" />
              </div>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" disabled={saving || !dialog.row.name.trim()} onClick={save}>
                {saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add item"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Delete item</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Remove &quot;{confirmDelete.name}&quot;? This can&apos;t be undone.</p>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}>
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `setup-view.tsx`**

Find the lucide-react import block:

```typescript
  User, Bell, Webhook, RotateCcw,
} from "lucide-react";
```

Replace with:

```typescript
  User, Bell, Webhook, RotateCcw, ConciergeBell,
} from "lucide-react";
```

Find:

```typescript
import { MenuItemsManager } from "./menu-items-manager";
```

Replace with:

```typescript
import { MenuItemsManager } from "./menu-items-manager";
import { ServiceItemsManager } from "./service-items-manager";
```

Find the `SECTIONS` entry for menu items:

```typescript
  { id: "menu-items",  group: "Rates & Packages" as SectionGroup,        label: "Menu Items",               icon: Utensils,     hint: "Dish catalog · price · photo · POS", accent: "accent"  as const },
```

Replace with:

```typescript
  { id: "menu-items",  group: "Rates & Packages" as SectionGroup,        label: "Menu Items",               icon: Utensils,     hint: "Dish catalog · price · photo · POS", accent: "accent"  as const },
  { id: "service-items", group: "Rates & Packages" as SectionGroup,      label: "Room Service & Requests",  icon: ConciergeBell, hint: "Snacks · laundry · concierge services", accent: "accent" as const },
```

Find the `data` object's placeholder for menu items:

```typescript
  "menu-items": [],
```

Replace with:

```typescript
  "menu-items": [],
  "service-items": [],
```

Find the `CUSTOM_SECTIONS` set:

```typescript
  const CUSTOM_SECTIONS = new Set<SectionId>(["preferences", "security", "channels", "webhooks", "floors", "room-types", "rooms", "pricing", "seasons", "food", "menu-items", "group-services", "group-policies", "pricing-rules", "rate-restrictions", "tables", "agents", "tax", "templates", "roles", "branding", "integrations", "backup"]);
```

Replace with:

```typescript
  const CUSTOM_SECTIONS = new Set<SectionId>(["preferences", "security", "channels", "webhooks", "floors", "room-types", "rooms", "pricing", "seasons", "food", "menu-items", "service-items", "group-services", "group-policies", "pricing-rules", "rate-restrictions", "tables", "agents", "tax", "templates", "roles", "branding", "integrations", "backup"]);
```

Find the render line for the menu-items manager:

```typescript
            {active === "menu-items" && <MenuItemsManager onToast={showToast} />}
```

Replace with:

```typescript
            {active === "menu-items" && <MenuItemsManager onToast={showToast} />}
            {active === "service-items" && <ServiceItemsManager onToast={showToast} />}
```

- [ ] **Step 3: Type-check**

Run (from `luxe-pms`): `npx tsc --noEmit`
Expected: no errors referencing `service-items-manager.tsx` or `setup-view.tsx`.

- [ ] **Step 4: Manual browser verification**

1. With the dev servers running and logged in as `admin@hotel.com` / `password123`, go to Settings.
2. Open the new **Room Service & Requests** section (in the "Rates & Packages" group, next to Menu Items).
3. Confirm all 3 sub-tabs (Snacks/Minibar, Laundry, Other services) show the 10/8/8 seeded items.
4. Add a new item (e.g. "Test Snack", ₹99) in Snacks/Minibar. Confirm it appears immediately in the list.
5. Edit that item's price, confirm it updates. Toggle its Active switch off, confirm it shows "Hidden". Delete it, confirm it disappears.
6. Reload the page — confirm the sub-tab still reflects the current (non-deleted) state, proving it persisted server-side, not just in local state.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/service-items-manager.tsx" "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(luxe-pms): add Room Service & Requests settings section for service-items"
```

---

### Task 6: End-to-end verification — an item added in Settings appears in the order dialog

**Files:** none (verification only, ties Task 4 and Task 5 together).

- [ ] **Step 1: Confirm the full loop for each of the 3 real-catalog tabs**

With the dev servers running and logged in as `admin@hotel.com` / `password123`:

1. Settings → Room Service & Requests → Laundry tab → Add item: name "Test Ironing", price 199, no note. Save.
2. Room Rack → open any occupied room → Order → Laundry tab. Confirm "Test Ironing · ₹199" appears in the list (no code change was needed — it came straight from the API).
3. Repeat once for Snacks/Minibar and once for Other services to confirm all 3 tabs are live, not just Laundry.
4. Settings → Menu Items → Add a new dish (e.g. "Test Dish", ₹1). Room Rack → Order → Food & Drinks tab → confirm "Test Dish" appears.
5. Delete the 4 test items you just added (from their respective Settings tabs) so the seeded catalog is left clean.

- [ ] **Step 2: Run the full frontend test suite**

Run (from `luxe-pms`): `npm test`
Expected: all tests pass, including the new `order-catalog.test.ts`.

- [ ] **Step 3: Run the full backend test suite**

Run (from `hotel-pms-api`): `C:\php84\php.exe artisan test`
Expected: all tests pass, including the new `ServiceItemsTest`.

No commit for this task — it's verification only, confirming Tasks 1–5 integrate correctly.
