# Group Booking Pricing → Real Setup Config — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Price the New Group Booking flow from configured data (room types, rate plans, agents, a new Group Services catalog, GST slabs) instead of hardcoded constants.

**Architecture:** A new generic `group-services` resource (backend) + a Setup manager (frontend) provide the services catalog. A pure `group-pricing.ts` helper computes totals. `groups/new` fetches `/room-types`, `/rate-plans`, `/agents`, `/group-services`, `/gst-slabs` and renders from the helper.

**Tech Stack:** Laravel 11 + Postgres (PHPUnit), Next.js 16 / React 19 / TypeScript (vitest node-env), reusing the existing `ResourceController` + Setup-manager patterns.

## Global Constraints

- Backend `hotel-pms-api/` (run artisan/phpunit with `C:/php84/php.exe`); frontend `luxe-pms/` (run `npm` from there).
- Follow the existing generic-resource pattern (see `menu-items`/`pos-tables` in `ResourceController.php`) and Setup-manager pattern (`menu-items-manager.tsx`).
- **Any new Setup section MUST be added to BOTH `CUSTOM_SECTIONS` and `INITIAL_DATA`** in `setup-view.tsx` (omitting either crashes the section with `undefined.map` — the Restaurant Tables bug).
- Frontend tests are node-env pure-logic only (no jsdom); UI verified via `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- All API routes are under `auth:sanctum`; feature tests use `$this->actingAs(User::factory()->create(), 'sanctum')` + `RefreshDatabase`.
- Reuse `apiGet/apiPost/apiPut/apiDelete` from `@/lib/api`, `money`/`cn` from `@/lib/utils`.

---

### Task 1: Backend `group-services` resource + seeder

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_22_100000_create_group_services.php`
- Create: `hotel-pms-api/app/Models/GroupService.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`
- Create: `hotel-pms-api/database/seeders/GroupServiceSeeder.php`
- Modify: `hotel-pms-api/database/seeders/DatabaseSeeder.php`
- Test: `hotel-pms-api/tests/Feature/GroupServicesTest.php`

**Interfaces:**
- Produces: `GET/POST/PUT/DELETE /group-services` (generic ResourceController). Row shape `{ id, name, category, price, perPax, gst, active }`.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/GroupServicesTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupServicesTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    public function test_crud_round_trip(): void
    {
        $this->auth();

        $created = $this->postJson('/api/group-services', [
            'name' => 'Grand Ballroom', 'category' => 'Hall', 'price' => 10000,
            'perPax' => false, 'gst' => 18, 'active' => true,
        ])->assertCreated()->json();

        $this->getJson('/api/group-services')->assertOk()
            ->assertJsonFragment(['name' => 'Grand Ballroom', 'price' => 10000]);

        $this->putJson("/api/group-services/{$created['id']}", ['price' => 12000])
            ->assertOk()->assertJsonPath('price', 12000);

        $this->deleteJson("/api/group-services/{$created['id']}")->assertNoContent();
        $this->getJson('/api/group-services')->assertOk()->assertJsonMissing(['name' => 'Grand Ballroom']);
    }

    public function test_name_is_required(): void
    {
        $this->auth();
        $this->postJson('/api/group-services', ['price' => 100])->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=GroupServicesTest`
Expected: FAIL — unknown resource / 404 (route + model don't exist).

- [ ] **Step 3: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_22_100000_create_group_services.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_services', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('category')->default('Other');
            $t->integer('price')->default(0);
            $t->boolean('perPax')->default(false);
            $t->integer('gst')->default(0);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_services');
    }
};
```

- [ ] **Step 4: Create the model**

Create `hotel-pms-api/app/Models/GroupService.php`:

```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GroupService extends Model {
    protected $table = 'group_services';
    protected $guarded = ['id'];
    protected $casts = ['perPax' => 'boolean', 'active' => 'boolean', 'price' => 'integer', 'gst' => 'integer'];
}
```

- [ ] **Step 5: Register in ResourceController**

In `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php`:

(a) Add the import near the other `use App\Models\...` lines:
```php
use App\Models\GroupService;
```
(b) Add to the `MODELS` map (near `'menu-items'`):
```php
        'group-services'         => GroupService::class,
```
(c) Add to `RULES`:
```php
        'group-services' => [
            'name' => 'string|max:255', 'category' => 'string|max:50|nullable',
            'price' => 'integer|min:0', 'perPax' => 'boolean',
            'gst' => 'integer|min:0|max:100', 'active' => 'boolean',
        ],
```
(d) Add to `REQUIRED_ON_CREATE`:
```php
        'group-services' => ['name'],
```
(e) Add to `MODULE_LABELS`:
```php
        'group-services' => 'Group Services',
```

- [ ] **Step 6: Create the seeder + register it**

Create `hotel-pms-api/database/seeders/GroupServiceSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GroupServiceSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('group_services')->count() > 0) {
            return;
        }
        $now = now();
        $rows = [
            ['Grand Ballroom (banquet)', 'Hall', 10000, false],
            ['Pearl Hall (full day)', 'Hall', 6500, false],
            ['Group breakfast buffet', 'F&B', 75, true],
            ['Group lunch buffet', 'F&B', 110, true],
            ['Group dinner buffet', 'F&B', 135, true],
            ['Airport pickup (per coach)', 'Transfer', 350, false],
            ['Decoration package', 'Decor', 4500, false],
            ['AV / Stage setup', 'AV', 2200, false],
        ];
        DB::table('group_services')->insert(array_map(fn ($r) => [
            'name' => $r[0], 'category' => $r[1], 'price' => $r[2], 'perPax' => $r[3],
            'gst' => 18, 'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ], $rows));
    }
}
```

In `hotel-pms-api/database/seeders/DatabaseSeeder.php`, add `GroupServiceSeeder::class,` to the `$this->call([...])` array (near `FbMenuSeeder::class`).

- [ ] **Step 7: Migrate + run the tests**

Run: `C:/php84/php.exe hotel-pms-api/artisan migrate`
Expected: `create_group_services ... DONE`.

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=GroupServicesTest`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add hotel-pms-api/database/migrations/2026_06_22_100000_create_group_services.php hotel-pms-api/app/Models/GroupService.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/database/seeders/GroupServiceSeeder.php hotel-pms-api/database/seeders/DatabaseSeeder.php hotel-pms-api/tests/Feature/GroupServicesTest.php
git commit -m "feat(api): group-services resource + seeder for group booking add-ons"
```

---

### Task 2: Pure pricing helper `group-pricing.ts`

**Files:**
- Create: `luxe-pms/src/lib/group-pricing.ts`
- Test: `luxe-pms/src/lib/group-pricing.test.ts`

**Interfaces:**
- Produces:
  - `interface GstSlab { from: number; to?: number | null; rate: number }`
  - `interface GroupRoomRow { rate: number; qty: number }`
  - `interface GroupSvcLine { price: number; perPax: boolean; gst: number }`
  - `interface GroupTotals { roomSubtotal: number; servicesSubtotal: number; gst: number; grandTotal: number }`
  - `gstRateForRate(rate: number, slabs: GstSlab[]): number`
  - `computeGroupTotals(rooms: GroupRoomRow[], nights: number, services: GroupSvcLine[], totalPax: number, slabs: GstSlab[]): GroupTotals`

> Run `npm` from `luxe-pms/`.

- [ ] **Step 1: Write the failing test**

Create `luxe-pms/src/lib/group-pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { gstRateForRate, computeGroupTotals } from "@/lib/group-pricing";

const slabs = [
  { from: 0, to: 1000, rate: 12 },
  { from: 1001, to: 7500, rate: 12 },
  { from: 7501, to: null, rate: 18 },
];

describe("gstRateForRate", () => {
  it("picks the slab whose band contains the rate", () => {
    expect(gstRateForRate(650, slabs)).toBe(12);
    expect(gstRateForRate(9000, slabs)).toBe(18);
  });
  it("falls back to the highest slab when above all bands with a closed top", () => {
    expect(gstRateForRate(50, [{ from: 100, to: 200, rate: 5 }])).toBe(5);
  });
  it("returns 0 when there are no slabs", () => {
    expect(gstRateForRate(500, [])).toBe(0);
  });
});

describe("computeGroupTotals", () => {
  it("sums room subtotal (rate*qty*nights) and per-room GST by slab", () => {
    const t = computeGroupTotals([{ rate: 650, qty: 10 }], 2, [], 0, slabs);
    expect(t.roomSubtotal).toBe(13000);          // 650*10*2
    expect(t.servicesSubtotal).toBe(0);
    expect(t.gst).toBe(1560);                      // 13000 * 12%
    expect(t.grandTotal).toBe(14560);
  });
  it("handles per-pax services (price*pax*nights) and flat services (price), each with own GST", () => {
    const t = computeGroupTotals(
      [],
      2,
      [{ price: 75, perPax: true, gst: 18 }, { price: 4500, perPax: false, gst: 18 }],
      20,
      slabs,
    );
    // perPax: 75*20*2 = 3000 ; flat: 4500 ; subtotal 7500
    expect(t.servicesSubtotal).toBe(7500);
    expect(t.gst).toBe(1350);                      // 7500 * 18%
    expect(t.grandTotal).toBe(8850);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- group-pricing`
Expected: FAIL — cannot resolve `@/lib/group-pricing`.

- [ ] **Step 3: Implement the helper**

Create `luxe-pms/src/lib/group-pricing.ts`:

```ts
// Pure pricing math for the New Group Booking flow. Framework-free (node-testable).

export interface GstSlab { from: number; to?: number | null; rate: number }
export interface GroupRoomRow { rate: number; qty: number }
export interface GroupSvcLine { price: number; perPax: boolean; gst: number }
export interface GroupTotals {
  roomSubtotal: number;
  servicesSubtotal: number;
  gst: number;
  grandTotal: number;
}

/** GST % for a per-night room rate: the slab whose [from,to] band contains it,
 *  else the highest slab, else 0. */
export function gstRateForRate(rate: number, slabs: GstSlab[]): number {
  if (!slabs.length) return 0;
  const hit = slabs.find(s => rate >= s.from && (s.to == null || rate <= s.to));
  if (hit) return hit.rate;
  return slabs.reduce((m, s) => (s.rate > m ? s.rate : m), 0);
}

export function computeGroupTotals(
  rooms: GroupRoomRow[],
  nights: number,
  services: GroupSvcLine[],
  totalPax: number,
  slabs: GstSlab[],
): GroupTotals {
  let roomSubtotal = 0;
  let roomGst = 0;
  for (const r of rooms) {
    const amt = (Number(r.rate) || 0) * (Number(r.qty) || 0) * (Number(nights) || 0);
    roomSubtotal += amt;
    roomGst += (amt * gstRateForRate(Number(r.rate) || 0, slabs)) / 100;
  }

  let servicesSubtotal = 0;
  let svcGst = 0;
  for (const sv of services) {
    const amt = sv.perPax
      ? (Number(sv.price) || 0) * (Number(totalPax) || 0) * (Number(nights) || 0)
      : (Number(sv.price) || 0);
    servicesSubtotal += amt;
    svcGst += (amt * (Number(sv.gst) || 0)) / 100;
  }

  const gst = Math.round(roomGst + svcGst);
  const grandTotal = Math.round(roomSubtotal + servicesSubtotal + gst);
  return { roomSubtotal, servicesSubtotal, gst, grandTotal };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- group-pricing`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add luxe-pms/src/lib/group-pricing.ts luxe-pms/src/lib/group-pricing.test.ts
git commit -m "feat(groups): pure group-pricing helper (room/service subtotals + GST slabs)"
```

---

### Task 3: Setup → Group Services manager

**Files:**
- Create: `luxe-pms/src/app/(app)/setup/group-services-manager.tsx`
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`

**Interfaces:**
- Consumes: `apiGet/apiPost/apiPut/apiDelete`, `/group-services` (Task 1).
- Produces: `GroupServicesManager` component + a Setup section.

- [ ] **Step 1: Create the manager**

Create `luxe-pms/src/app/(app)/setup/group-services-manager.tsx`:

```tsx
"use client";
import * as React from "react";
import { Plus, Edit, Trash2, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Row = { id: number | string; name: string; category: string; price: number; perPax: boolean; gst: number; active: boolean };
const CATEGORIES = ["Hall", "F&B", "Decor", "AV", "Transfer", "Other"];
const blank = (): Row => ({ id: "", name: "", category: "Hall", price: 0, perPax: false, gst: 18, active: true });

export function GroupServicesManager({ onToast }: { onToast?: (m: string) => void }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: Row } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<Row | null>(null);
  const toast = (m: string) => onToast?.(m);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>("/group-services").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = async (row: Row) => {
    setSaving(true);
    const body = { name: row.name.trim(), category: row.category, price: Number(row.price) || 0, perPax: row.perPax, gst: Number(row.gst) || 0, active: row.active };
    try {
      if (dialog?.mode === "edit") {
        const up = await apiPut<Row>(`/group-services/${row.id}`, body);
        setRows(rs => rs.map(r => (r.id === row.id ? { ...r, ...up } : r)));
        toast(`${body.name} updated`);
      } else {
        const created = await apiPost<Row>("/group-services", body);
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
      await apiDelete(`/group-services/${row.id}`);
      setRows(rs => rs.filter(r => r.id !== row.id));
      toast(`${row.name} removed`);
    } catch {
      toast("⚠ Couldn't delete — backend offline");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-accent" />Group Services</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} services · halls · meals · decor · transfers for group bookings</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create", row: blank() })}><Plus className="h-4 w-4" />Add service</Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">No group services yet. Click “Add service”.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row => (
            <Card key={row.id} className="p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{row.name}</p>
                <span className="text-sm font-semibold tabular text-brand shrink-0">{money(row.price)}{row.perPax ? "/pax" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge tone="neutral">{row.category}</Badge>
                <Badge tone="info">GST {row.gst}%</Badge>
                {!row.active && <Badge tone="warning">inactive</Badge>}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setDialog({ mode: "edit", row })}><Edit className="h-3 w-3" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}><Trash2 className="h-3 w-3" />Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">{dialog.mode === "edit" ? "Edit service" : "Add service"}</h3></div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={dialog.row.name} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, name: e.target.value } }))} className="h-9" autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={dialog.row.category} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, category: e.target.value } }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Price (₹)</Label><Input type="number" min={0} value={dialog.row.price} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, price: Math.max(0, Number(e.target.value)) } }))} className="h-9 tabular" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">GST (%)</Label><Input type="number" min={0} max={100} value={dialog.row.gst} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, gst: Math.max(0, Math.min(100, Number(e.target.value))) } }))} className="h-9 tabular" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pricing</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([["Flat", false], ["Per pax", true]] as const).map(([lbl, val]) => (
                      <button key={lbl} type="button" onClick={() => setDialog(d => d && ({ ...d, row: { ...d.row, perPax: val } }))} className={"h-9 rounded-md border text-xs font-medium transition-colors " + (dialog.row.perPax === val ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken")}>{lbl}</button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={dialog.row.active} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, active: e.target.checked } }))} />Active</label>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" disabled={saving || !dialog.row.name.trim()} onClick={() => save(dialog.row)}>{saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add service"}</Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Delete service</h3><p className="text-xs text-muted-foreground mt-0.5">Remove “{confirmDelete.name}”?</p></div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30"><Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into setup-view**

In `luxe-pms/src/app/(app)/setup/setup-view.tsx`:

(a) Import, below the `MenuItemsManager` import:
```tsx
import { GroupServicesManager } from "./group-services-manager";
```
(b) Add to `SECTIONS`, immediately after the `food` entry:
```tsx
  { id: "group-services", group: "Rates & Packages" as SectionGroup,     label: "Group Services",           icon: Utensils,     hint: "Halls · meals · decor · transfers for groups", accent: "accent" as const },
```
(c) Add `"group-services"` to the `CUSTOM_SECTIONS` set.
(d) Add to `INITIAL_DATA` (custom-rendered area):
```tsx
    "group-services": [],
```
(e) Add the render line after the `{active === "menu-items" && ...}` line:
```tsx
            {active === "group-services" && <GroupServicesManager onToast={showToast} />}
```

- [ ] **Step 3: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors; `npm run build` → succeeds (confirms the new `SectionId` is exhaustively handled).

- [ ] **Step 4: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/group-services-manager.tsx" "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(setup): Group Services manager section"
```

---

### Task 4: Rewire `groups/new` pricing to real config

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx`

**Interfaces:**
- Consumes: `computeGroupTotals`/`gstRateForRate` from `@/lib/group-pricing`; `/room-types`, `/rate-plans`, `/agents`, `/group-services`, `/gst-slabs`.

- [ ] **Step 1: Import the helper and add config state**

Add the import below the existing `@/lib/api` import:
```tsx
import { computeGroupTotals, type GstSlab } from "@/lib/group-pricing";
```

Add config-fetch state near the other `useState`/effects (after the `/room-board` + `/bookings` effect, ~line 135):
```tsx
  type RoomType = { name: string; baseTariff: number };
  type RatePlan = { code: string; name: string; discountPct?: number };
  type AgentRow = { name: string; type?: string };
  type GroupSvc = { id: number | string; name: string; category: string; price: number; perPax: boolean; gst: number; active: boolean };
  const [roomTypes, setRoomTypes] = React.useState<RoomType[]>([]);
  const [ratePlans, setRatePlans] = React.useState<RatePlan[]>([]);
  const [agents, setAgents] = React.useState<AgentRow[]>([]);
  const [svcCatalog, setSvcCatalog] = React.useState<GroupSvc[]>([]);
  const [gstSlabs, setGstSlabs] = React.useState<GstSlab[]>([]);
  React.useEffect(() => {
    apiGet<RoomType[]>("/room-types").then(r => Array.isArray(r) && setRoomTypes(r)).catch(() => {});
    apiGet<RatePlan[]>("/rate-plans").then(r => Array.isArray(r) && setRatePlans(r)).catch(() => {});
    apiGet<AgentRow[]>("/agents").then(r => Array.isArray(r) && setAgents(r)).catch(() => {});
    apiGet<GroupSvc[]>("/group-services").then(r => Array.isArray(r) && setSvcCatalog(r.filter(s => s.active))).catch(() => {});
    apiGet<GstSlab[]>("/gst-slabs").then(r => Array.isArray(r) && setGstSlabs(r)).catch(() => {});
  }, []);

  const selectedPlan = ratePlans.find(p => p.code === ratePlan || p.name === ratePlan);
  const planDiscount = Number(selectedPlan?.discountPct) || 0;
  const suggestRate = React.useCallback((typeName: string) => {
    const base = roomTypes.find(t => t.name === typeName)?.baseTariff ?? 0;
    return Math.round(base * (1 - planDiscount / 100));
  }, [roomTypes, planDiscount]);
```

- [ ] **Step 2: Remove the hardcoded constants**

Delete the `ROOM_TYPES` constant (lines ~18–25) and the `SERVICE_OPTIONS` constant (lines ~92–101). Replace any remaining `ROOM_TYPES`-derived default rate (in the initial `block` state and `addBlock`) with `0` for the rate — it gets set by `suggestRate` once a type is chosen. So:
- `useState<BlockRow[]>([{ id: "b1", type: "Deluxe", qty: 0, rate: 0 }])`
- `addBlock = () => setBlock(b => [...b, { id: \`b${Date.now()}\`, type: "Deluxe", qty: 0, rate: 0 }]);`

Add an effect that fills unedited room rates once room types / plan load. Track edited rows with a ref set:
```tsx
  const editedRates = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!roomTypes.length) return;
    setBlock(prev => prev.map(r => editedRates.current.has(r.id) ? r : { ...r, rate: suggestRate(r.type) || r.rate }));
  }, [roomTypes, suggestRate]);
```
In `updateBlock`, when the user edits `rate`, mark it edited; when they change `type`, re-suggest (unless rate was edited). Replace `updateBlock` with:
```tsx
  const updateBlock = (id: string, key: keyof BlockRow, value: number | string) => {
    setBlock(b => b.map(r => {
      if (r.id !== id) return r;
      if (key === "rate") { editedRates.current.add(id); return { ...r, rate: Number(value) || 0 }; }
      if (key === "type") { const next = { ...r, type: String(value) }; if (!editedRates.current.has(id)) next.rate = suggestRate(String(value)) || r.rate; return next; }
      return { ...r, [key]: value };
    }));
  };
```

- [ ] **Step 3: Wire the room-type, rate-plan and agent dropdowns**

- The room-block **type `<Select>`** options: replace any list derived from `ROOM_TYPES` with `roomTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)` (keep the existing availability/qty logic untouched).
- The **rate-plan `<Select>`** (the `ratePlan` state control, ~line 450): replace the hardcoded `<option>`s with:
```tsx
  {ratePlans.length ? ratePlans.map(p => <option key={p.code} value={p.code}>{p.name}{p.discountPct ? ` (−${p.discountPct}%)` : ""}</option>) : <option value="CP">CP</option>}
```
- The **Agent/Corporate `<Select>`** (shown when `bookedBy` is Agent/Corporate, ~line 338): replace the hardcoded names with:
```tsx
  {agents.length ? agents.map(a => <option key={a.name} value={a.name}>{a.name}</option>) : <option value="">No agents configured</option>}
```

- [ ] **Step 4: Replace the services picker source**

Wherever the services checkboxes render (mapping over `SERVICE_OPTIONS`), map over `svcCatalog` instead, using `svc.id` (as string) for the `services` id list and showing `money(svc.price)`+`/pax` when `perPax`. The `services` state stays `string[]` of selected ids (`String(svc.id)`).

- [ ] **Step 5: Replace the pricing math with the helper**

Replace the block (lines ~229–237):
```tsx
  const roomSubtotal = block.reduce((s, b) => s + b.qty * b.rate * nights, 0);
  const servicesTotal = services.reduce((s, id) => {
    const svc = SERVICE_OPTIONS.find(o => o.id === id);
    if (!svc) return s;
    return s + (svc.perPax ? svc.price * pax * nights : svc.price);
  }, 0);
  const subtotal = roomSubtotal + servicesTotal;
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
```
with:
```tsx
  const selectedSvcLines = services
    .map(id => svcCatalog.find(s => String(s.id) === id))
    .filter((s): s is GroupSvc => !!s)
    .map(s => ({ price: s.price, perPax: s.perPax, gst: s.gst }));
  const totals = computeGroupTotals(
    block.map(b => ({ rate: b.rate, qty: b.qty })), nights, selectedSvcLines, pax, gstSlabs,
  );
  const roomSubtotal = totals.roomSubtotal;
  const servicesTotal = totals.servicesSubtotal;
  const subtotal = roomSubtotal + servicesTotal;
  const tax = totals.gst;
  const total = totals.grandTotal;
```
(Everything downstream — `advance`, the summary UI showing `subtotal`/`tax`/`total` — keeps working since those names are preserved.)

- [ ] **Step 6: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors in the file; `npm run build` → succeeds (confirms no dangling `ROOM_TYPES`/`SERVICE_OPTIONS` references).

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/groups/new/page.tsx"
git commit -m "feat(groups): price new group bookings from room-types/rate-plans/agents/group-services + GST slabs"
```

---

## Self-Review

**Spec coverage:**
- New `group-services` resource + seeder → Task 1. ✓
- Setup Group Services manager + section (CUSTOM_SECTIONS + INITIAL_DATA) → Task 3. ✓
- `groups/new` reads room-types (tariff, editable, discount-aware), rate-plans, agents, group-services, gst-slabs → Task 4. ✓
- GST: room gst-slab + per-service gst replacing hardcoded 5% → Task 2 (`computeGroupTotals`) + Task 4 Step 5. ✓
- Pure unit-tested pricing helper → Task 2. ✓
- Out-of-scope (seasonal, repricing, persistence shape) → untouched. ✓

**Placeholder scan:** No TBD/vague steps; complete code for Tasks 1–3 and exact before/after for Task 4. ✓

**Type consistency:** `GstSlab`/`computeGroupTotals` (Task 2) consumed in Task 4 with matching shapes. The `GroupSvc` row shape (Task 1 columns: name/category/price/perPax/gst/active) matches the manager (Task 3) and the `groups/new` `svcCatalog` type (Task 4). `discountPct` read from rate-plans matches the `RatePlan` rules already in `ResourceController`. Preserved downstream names (`roomSubtotal`, `servicesTotal`, `subtotal`, `tax`, `total`, `advance`). ✓
