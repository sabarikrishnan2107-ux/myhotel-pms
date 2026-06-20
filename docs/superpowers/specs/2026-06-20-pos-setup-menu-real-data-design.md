# POS + Setup — real menu data & live POS

**Date:** 2026-06-20
**Scope:** Frontend (`luxe-pms`) mostly; one shared component extraction. No backend schema
changes (the `/menu-items`, `/pos-tables`, `/fb-orders` endpoints already support what we
need). Builds on the just-shipped add-menu-item feature.

## Goals

1. **Setup & Settings → Menu Items manager:** a new section to manage the dish catalog
   (add / edit / delete, with photo), backed by the real `/menu-items` CRUD.
2. **POS page made live:** replace the remaining mock pieces —
   - **Order ticket:** selecting a table loads its open order from `/fb-orders` (not the
     hardcoded `PRELOADED` T3 demo).
   - **KPI strip:** Active KOTs / Avg dwell / Covers / Revenue computed from real
     `/fb-orders` + `/pos-tables` (not the hardcoded `7 / 48 min / 142 / ₹1,86,400`).
   - **Floor map:** confirmed live from `/pos-tables` (already seeded); keep the offline
     fallback only.
3. **Keep** the POS quick `+ New item` button (writes to the same `/menu-items`).

## Key design decisions

### A. Shared `MenuItemDialog` (DRY)

Extract the POS `NewMenuItemModal` into a shared component
`src/components/menu-item-dialog.tsx` supporting **create and edit** modes (name, category,
price, veg, spice, tag, photo via `apiUpload`). Both the POS quick-add and the Setup
manager use it. Reuses the existing `buildMenuItemPayload` / `isValidMenuItemForm` helper.
The POS page is refactored to consume it (its inline modal is removed).

### B. Setup "Menu Items" section

- New entry in `setup-view.tsx` `SECTIONS`: `id: "menu-items"`, group `"Rates & Packages"`,
  label "Menu Items", icon `UtensilsCrossed`, near the existing "Food & Hall Packages".
- New self-contained component `src/app/(app)/setup/menu-items-manager.tsx` (keeps the
  already-3 k-line `setup-view.tsx` from growing): loads `/menu-items`, renders a grid/list
  with photo thumbnail, name, category, price, veg/spice/tag, and **Add / Edit / Delete**.
  - Add/Edit → `MenuItemDialog` → `apiPost` / `apiPut("/menu-items/{id}")`.
  - Delete → confirm, then `apiDelete("/menu-items/{id}")`.
  - `setup-view.tsx` change is tiny: import + one `SECTIONS` entry + one
    `{active === "menu-items" && <MenuItemsManager />}` render line.

### C. POS order ticket from `/fb-orders` (tolerant table-code match)

Data reality: `PosTableSeeder` uses codes `T1…T20`; `FbOrderSeeder` uses `T-07`, `Bar-5`,
etc. — they don't match. Rather than a destructive re-seed, match **tolerantly**: a pure
helper `normalizeTableCode(code)` upper-cases, strips non-alphanumerics, and drops leading
zeros in the trailing number (`"T-07" → "T7"`, `"T3" → "T3"`). On table select, load the
table's open order = the `/fb-orders` row whose normalized `tableNo` equals the selected
table's normalized code **and** whose status is `placed | preparing | ready`; map its
`items[]` (`{name, qty, price}`) to ticket lines. `PRELOADED` is removed. (Off-menu
fb-order item fields like spice/extras aren't present in `/fb-orders`, so lines show
name/qty/price only — consistent with the data.)

### D. POS KPI strip (computed)

From the already-loaded `tables` plus a new `/fb-orders` fetch, via `useMemo`:
- **Active KOTs** = count(status ∈ {placed, preparing, ready}); sub = "{placed} in queue ·
  {preparing} cooking".
- **Avg dwell** = average of (now − `seatedAt`) over tables that have `seatedAt`, in
  minutes; `"—"` when none. (`seatedAt` is an `"HH:MM"` string interpreted as today.)
- **Covers today** = sum of `covers` across tables.
- **Revenue today** = sum of `fb_orders.total` for rows created today.

The KPI math lives in a pure helper `computePosKpis(orders, tables, now)` so it is
unit-testable in the node env.

### E. Floor map

Already loaded from `/pos-tables` (seeded by `PosTableSeeder`). No change beyond keeping the
in-file seed array as the offline fallback. Verified live during testing.

## Files

- Create: `src/components/menu-item-dialog.tsx` (shared dialog, create+edit).
- Create: `src/app/(app)/setup/menu-items-manager.tsx` (Setup CRUD panel).
- Create: `src/lib/pos-data.ts` (pure: `normalizeTableCode`, `computePosKpis`,
  `openOrderForTable`) + `src/lib/pos-data.test.ts`.
- Modify: `src/app/(app)/fb/pos/page.tsx` (use shared dialog; live ticket; live KPIs).
- Modify: `src/app/(app)/setup/setup-view.tsx` (one section entry + import + render line).

## Out of scope (YAGNI)

- New backend endpoints or schema changes; no KPI/aggregation API (computed client-side).
- Re-seeding or migrating `fb_orders` table codes (handled by tolerant matching).
- Editing live orders from the POS ticket beyond what already exists; KDS/Z-Report buttons.
- Multi-photo, bulk import.

## Testing

- Unit (node env): `normalizeTableCode`, `computePosKpis`, `openOrderForTable`.
- API: `/menu-items` POST/PUT/DELETE round-trip with photo.
- Browser (Playwright): Setup → add/edit/delete a dish (with photo) and see the list update
  and persist; POS → select a seeded table and see its real order load; KPI numbers reflect
  seeded data, not the old constants.
