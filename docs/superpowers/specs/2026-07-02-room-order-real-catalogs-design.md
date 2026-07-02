# Room-order dialog — real catalogs instead of hardcoded items

**Date:** 2026-07-02
**Scope:** Backend (`hotel-pms-api`) — one new resource. Frontend (`luxe-pms`) — new Settings
section + wiring the Room Rack "Order for Room" dialog to real data.

## Problem

The "Order for Room" dialog (Room Rack → room card → Order) has 4 tabs — Food & Drinks,
Snacks/Minibar, Laundry, Other services — each backed by a hardcoded `ORDER_CATALOG` object
in `rack/page.tsx`. Food & Drinks already has a real, settings-editable catalog
(`/menu-items`, managed at Settings → Menu Items) but the dialog doesn't use it. The other 3
tabs have no settings page at all — there is nowhere to add/edit/remove a snack, a laundry
rate, or a concierge service.

## Goals

1. Food & Drinks tab reads from the existing `/menu-items` API instead of the hardcoded list.
2. Snacks/Minibar, Laundry, Other services become real, settings-editable catalogs backed by
   one new API resource.
3. A new Settings section lets staff add/edit/delete items in all 3 of those catalogs.
4. Nothing regresses if the backend is briefly unreachable — same offline-fallback pattern
   used elsewhere in this codebase (hardcoded array shown until the real fetch resolves).

## Key design decisions

### A. Food & Drinks → `/menu-items` (no backend change)

In `rack/page.tsx`, replace `ORDER_CATALOG.food` with menu items fetched via
`apiGet<MenuRow[]>("/menu-items")`, mapped to the dialog's `{id, name, price}` item shape
(menu items have no `hint`/description field, so that line is simply omitted for these rows).
This is the same resource already managed at Settings → Menu Items — no new backend work.

### B. One new unified resource: `service-items`

Snacks/Minibar, Laundry, and Other services are structurally identical (name, price, optional
note, on/off) — one table with a `kind` discriminator, rather than three near-duplicate
tables/models/seeders/settings-pages.

- **Migration** `create_service_items_table`: `id, kind (string), name (string), price
  (integer, default 0), hint (string, nullable), active (boolean, default true), company_id
  (unsignedBigInteger, nullable, indexed), timestamps`. `company_id` is included directly in
  the create (this table is new after the multi-tenancy retrofit migration, so it doesn't need
  a follow-up "add company_id" migration like the older tables did).
- **Model** `App\Models\ServiceItem`: `use BelongsToCompany;`, `$guarded = ['id']`, casts
  `price` → integer, `active` → boolean. Same shape as `MenuItem`/`ExtraService`.
- **`ResourceController` registration**, slug `service-items`:
  - `MODELS['service-items'] = ServiceItem::class`
  - `RULES['service-items'] = ['kind' => 'string|max:20', 'name' => 'string|max:255', 'price'
    => 'integer|min:0', 'hint' => 'string|max:255|nullable', 'active' => 'boolean']`
  - `REQUIRED_ON_CREATE['service-items'] = ['name', 'kind']`
  - `FILTER_BY['service-items'] = ['kind']` — so the frontend can call
    `GET /service-items?kind=laundry` and get just that tab's rows.
- **Seeder** `ServiceItemSeeder`, registered in `DatabaseSeeder`: transcribes the current
  hardcoded `ORDER_CATALOG.snacks` (10 rows), `.laundry` (8 rows), `.other` (8 rows) from
  `rack/page.tsx` into `kind: "snacks" | "laundry" | "other"` rows, via `ServiceItem::
  firstOrCreate(['kind' => ..., 'name' => ...], $row)` (idempotent re-seed, matching the
  `generic-resource-pattern`).

`kind` values are exactly the dialog's existing `OrderTab` strings (`"snacks" | "laundry" |
"other"`), so the frontend fetch and the tab key line up with no translation layer.

### C. New Settings section "Room Service & Requests"

- New `SECTIONS` entry in `setup-view.tsx`, group `"Rates & Packages"`, right after
  `"menu-items"`: `id: "service-items"`, label "Room Service & Requests", icon
  `ConciergeBell` (distinct from Menu Items' `Utensils`; `Bell` is already used by
  `"channels"`), hint "Snacks · laundry · concierge services".
- New self-contained component `src/app/(app)/setup/service-items-manager.tsx` (mirrors
  `menu-items-manager.tsx`): 3 sub-tabs (Snacks/Minibar, Laundry, Other services) inside the
  section; each sub-tab loads `/service-items?kind=<kind>`, renders a list (name, price or
  "Complimentary" when 0, hint, active toggle) with Add / Edit / Delete.
  - Add/Edit → a small inline form/dialog (name, price, hint, active) → `apiPost` /
    `apiPut("/service-items/{id}")`.
  - Delete → confirm, then `apiDelete("/service-items/{id}")`.
  - `setup-view.tsx` change stays small: import + one `SECTIONS` entry + one
    `{active === "service-items" && <ServiceItemsManager />}` render line.

### D. Order dialog wiring (`rack/page.tsx`)

On dialog open (`kind === "order"`), fetch in parallel:
`apiGet("/menu-items")` and `apiGet("/service-items")` (all kinds in one call, then
group client-side by `kind` — cheaper than 3 separate requests). Build the same
`Record<OrderTab, Item[]>` shape the dialog already renders from, replacing the hardcoded
`ORDER_CATALOG` object. Until the fetch resolves (or if it fails), keep showing the current
hardcoded arrays as the offline fallback — consistent with the project's established
mock-then-replace pattern. Everything downstream (cart, `ALL_ITEMS`, subtotal/tax/total,
"Send to kitchen/laundry/concierge") is unchanged since it only depends on the `{id, name,
price}` item shape.

## Files

- Create: `hotel-pms-api/database/migrations/2026_07_02_xxxxxx_create_service_items_table.php`
- Create: `hotel-pms-api/app/Models/ServiceItem.php`
- Create: `hotel-pms-api/database/seeders/ServiceItemSeeder.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (`MODELS`, `RULES`,
  `REQUIRED_ON_CREATE`, `FILTER_BY` entries for `service-items`)
- Modify: `hotel-pms-api/database/seeders/DatabaseSeeder.php` (register `ServiceItemSeeder`)
- Create: `luxe-pms/src/app/(app)/setup/service-items-manager.tsx`
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx` (one `SECTIONS` entry + import + render
  line)
- Modify: `luxe-pms/src/app/(app)/rack/page.tsx` (fetch `/menu-items` + `/service-items` on
  dialog open; replace hardcoded `ORDER_CATALOG` with fetched data; keep hardcoded arrays as
  offline fallback)

## Out of scope (YAGNI)

- The separate guest-facing menu page (`menu/[room]/page.tsx`) — a different, larger, more
  detailed catalog (descriptions, categories, badges) not shown in the reported screenshot.
  Not touched by this change.
- Sub-categories/grouping within a tab (e.g. splitting Laundry into Wash&Press vs Dry-clean) —
  the current dialog renders a flat list per tab; the new catalogs keep that shape.
- Photos for snacks/laundry/other items (Menu Items has photo support; this new catalog does
  not — the current hardcoded items don't have images either).
- Any change to how the order is billed/routed once submitted (folio charge creation, KOT
  printing, laundry/concierge routing) — unchanged.

## Testing

- API: `/service-items` GET (with `?kind=` filter) / POST / PUT / DELETE round-trip.
- Backend: `php artisan migrate --force` then `db:seed --class=ServiceItemSeeder --force`;
  confirm 26 rows seeded across the 3 kinds.
- Browser: Settings → Room Service & Requests → add/edit/delete an item in each of the 3
  sub-tabs, confirm it persists (reload). Room Rack → open a room → Order → confirm all 4 tabs
  show the real (settings-editable) catalogs, and an item added in Settings appears in the
  dialog without a code change.
