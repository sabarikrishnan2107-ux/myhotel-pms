# Restaurant Tables manager (Setup) — design

**Date:** 2026-06-20
**Status:** Approved (design)

## Problem
Restaurant tables live in the real `pos_tables` table and the POS floor map reads
them live, but there is no UI to add/edit/delete tables or set their seats — the
20 tables come only from the seeder. Backend `/pos-tables` already supports full
CRUD (validation allows `code`, `seats`, `zone`, `status`, …), so this is a
frontend-only addition.

## Scope (approved)
A new **Setup → Inventory → "Restaurant Tables"** manager that can:
- **Add** a table: `code` (e.g. T21), `seats`, `zone` → `POST /pos-tables` (status defaults `free`).
- **Edit** a table: `code` / `seats` / `zone` → `PUT /pos-tables/{id}`.
- **Delete** a table (with confirm) → `DELETE /pos-tables/{id}`.
- **Bulk add a range**: prefix (`T`) + start number + count + seats + zone → loops `POST`.
- List tables grouped by **zone**, showing code · seats · a status badge.

Out of scope (YAGNI): editing operational status (free/seated/dirty — live POS state);
visual drag-to-arrange layout.

## Implementation
- **New file:** `luxe-pms/src/app/(app)/setup/tables-manager.tsx` exporting
  `TablesManager({ onToast }: { onToast?: (m: string) => void })`, mirroring the
  existing `setup/menu-items-manager.tsx` (same load/save/delete + confirm-dialog shape).
  - State: `rows: PosTable[]`, `dialog` (create/edit), `bulk` (open), `saving`, `confirmDelete`.
  - `PosTable = { id; code; seats; zone?; status?; }`.
  - Load: `apiGet<PosTable[]>("/pos-tables")`.
  - Inline dialogs for add/edit and bulk (tables are simple — no shared dialog component needed).
  - Zone input: free text with a `<datalist>` of existing zones for convenience.
- **Wiring in `setup/setup-view.tsx`:**
  - Add a `SECTIONS` entry: `{ id: "tables", group: "Inventory", label: "Restaurant Tables", icon: Utensils, hint: "POS floor map · seats · zones", accent: "info" }` (reuse an already-imported icon).
  - Render `{active === "tables" && <TablesManager onToast={showToast} />}` alongside the other managers.
  - Import `TablesManager`.

## Result
The POS floor map already reads `/pos-tables` live, so added/edited/deleted tables
appear there immediately. No backend or DB changes.

## Verification
`tsc --noEmit` clean; production build passes; manually: add a table, bulk-add a
range, edit seats, delete — confirm via the floor map and `GET /pos-tables`.
