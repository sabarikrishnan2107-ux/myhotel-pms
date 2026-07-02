# Folio charges: show order time

**Date:** 2026-07-02
**Scope:** Frontend only (`luxe-pms`). No backend/migration changes.

## Problem

The Folio page's Charges tab groups line items by day ("Wed, 17/06/2026 · 3 items") but shows
no time of day, so staff can't tell what time a room-service order, spa booking, or other charge
was actually placed — only which calendar day it landed on.

## Why no backend change is needed

`folio_charges` (`hotel-pms-api/database/migrations/2026_06_04_130000_create_folio_tables.php:15-27`)
already has Eloquent's standard `$table->timestamps()`, giving every row a `created_at` column
set automatically at insert time. `FolioCharge` (`hotel-pms-api/app/Models/FolioCharge.php`) has
no `$hidden`, so `created_at` is already present, unfiltered, in every `GET /folio-charges`
response — it's just not in the frontend's `FolioCharge` type or rendered anywhere.

Because every charge-creating flow (Room Rack Order dialog, spa/service booking, manual "Add
charge", extend/reduce stay) posts through the same `POST /folio-charges` endpoint and Eloquent
stamps `created_at` at insert time regardless of caller, this timestamp is already an accurate
"when was this charge placed" value going forward. Historical/seeded rows will show their
seed-insert time instead of a real order time — accepted as-is, per decision below.

## Key design decisions

1. **Time source:** reuse the existing `created_at` column as-is (no new `ordered_at`/`charged_at`
   column, no changes to any charge-creation call site).
2. **Display:** a new **Time** column in `ChargesTable`, placed first (leftmost, before
   Description), shown for every charge type including Room rows (a Room row's `created_at` is
   when that charge was posted — e.g. at check-in for a multi-night charge — which is still
   meaningful, just not a per-night value).
3. **Ordering:** within each day group, rows sort by `created_at` ascending (chronological),
   instead of the current implicit DB-insertion order.
4. **Flat list** view needs no separate change — it renders through the same `ChargesTable`.

## Files

- Modify: `luxe-pms/src/lib/types.ts:101-111` — add `created_at?: string;` to `FolioCharge`
  (optional — see below). Field name matches the wire format verbatim (this codebase has no
  snake↔camel mapping layer; `bookingNo`/`paidBy` already pass through as literal DB column
  names, and Eloquent's `created_at`/`updated_at` are the one fixed exception to that camelCase
  convention).
- Modify: `luxe-pms/src/lib/mock-data.ts:131-143` — add a `created_at` ISO timestamp to each
  `SAMPLE_FOLIO_CHARGES` row (plausible times spread across each day) so local/demo mode shows
  realistic values.
- Modify: `luxe-pms/src/app/(app)/folio/[id]/page.tsx`:
  - `byDay` grouping (~line 202-205): after bucketing, sort each day's array by `created_at`
    ascending before it's handed to `ChargesTable` (rows with no `created_at` sort last).
  - `ChargesTable` (~lines 1001-1066): add a `<th>Time</th>` as the first header cell (before
    Description, ~line 1011) and a matching first `<td>` in each row (~line 1026) rendering
    `c.created_at ? formatTime(c.created_at) : "—"`. `formatTime` (`lib/utils.ts:84-91`) is
    already imported into this file (line 20) and already handles the user's 12/24-hour and
    timezone preferences.

**Why `created_at` is optional, not required:** `checkout/[id]/page.tsx:71-86` builds a
synthetic fallback bill breakdown (splitting a booking's total into per-night rows when no real
folio charges exist yet) and casts the result `as typeof SAMPLE_FOLIO_CHARGES`. That array has no
`created_at` and isn't real charge data — a required field would force adding a meaningless
timestamp there just to satisfy the type. All real charges (API-sourced or seeded mock data) do
have it; the `?"—"` fallback only ever shows for this one synthetic case. The `apiPost`
call sites that create real charges (`rack/page.tsx:721,740,779`, `folio/[id]/page.tsx:850-880`)
need no changes — they post plain request-body objects (`apiPost` takes `body: unknown`), and the
server stamps `created_at` automatically on insert regardless of what's posted.

## Out of scope (YAGNI)

- New DB column / migration for a dedicated order timestamp.
- Any change to charge-creation endpoints or dialogs (Room Rack Order, spa booking, manual
  charge form, extend/reduce stay) — they need no changes since `created_at` is auto-stamped.
- Blanking the Time column for Room-type rows — shown uniformly for all types, per decision above.
- Sorting the **flat list** view explicitly by time — it already renders in the API's return
  order (by `id`, i.e. insertion order), which is already chronological; only the day-grouped
  view's bucketing needed an explicit sort added.

## Testing

- Manual verification in the browser: open a booking's Folio → Charges tab.
  - Seeded/demo charges show plausible times in the new Time column.
  - Posting a new charge (e.g. via the Room Rack Order dialog or "Add charge") shows the actual
    current time immediately.
  - Within a day group, rows appear in chronological order.
  - Toggling to "Flat list" still shows the Time column via the same `ChargesTable`.
- `tsc` passes. Since `created_at` is optional, no other file needs a change to compile —
  confirmed `checkout/[id]/page.tsx`'s synthetic fallback bill (the only other place building a
  `FolioCharge[]`-shaped literal) stays untouched and still type-checks.
