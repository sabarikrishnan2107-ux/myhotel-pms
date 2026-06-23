# Group booking pricing → real Setup config

**Date:** 2026-06-22
**Scope:** Backend (new `group-services` resource) + frontend (new Setup "Group Services"
manager + rewire `groups/new` pricing). Sub-project #1 of the Setup-flow audit.

## Goal

Make the New Group Booking flow price from configured data instead of hardcoded constants:
room rates from `/room-types` + `/rate-plans`, agents from `/agents`, services from a new
`/group-services` catalog managed in Setup, and GST from `/gst-slabs` (rooms) + per-service
`gst`. Today everything in `groups/new` is hardcoded (`ROOM_TYPES`, `SERVICE_OPTIONS`,
inline rate-plan/agent options, `tax = subtotal * 0.05`).

## A. Backend — new `group-services` resource

Follow the generic `ResourceController` pattern (same as `menu-items`, `pos-tables`).

- **Migration** `create_group_services`: `id`, `name` (string), `category` (string, default
  `'Other'`), `price` (integer, default 0), `perPax` (boolean, default false), `gst`
  (integer, default 0), `active` (boolean, default true), timestamps.
- **Model** `App\Models\GroupService`: `$guarded = ['id']`; casts `perPax`/`active` →
  boolean, `price`/`gst` → integer.
- **ResourceController**: add `'group-services' => GroupService::class` to `MODELS`; `RULES`:
  `name` string|max:255, `category` string|max:50|nullable, `price` integer|min:0, `perPax`
  boolean, `gst` integer|min:0|max:100, `active` boolean; `REQUIRED_ON_CREATE` → `['name']`.
  Module label "Group Services".
- **Seeder** `GroupServiceSeeder` (idempotent, `if count>0 return`) preloading today's 8:
  Grand Ballroom (Hall, 10000), Pearl Hall (Hall, 6500), Group breakfast buffet (F&B, 75,
  perPax), Group lunch buffet (F&B, 110, perPax), Group dinner buffet (F&B, 135, perPax),
  Airport pickup per coach (Transfer, 350), Decoration package (Decor, 4500), AV / Stage
  setup (AV, 2200). Each `gst: 18, active: true`. Register in `DatabaseSeeder`.

## B. Frontend — Setup "Group Services" section

- New entry in `setup-view.tsx` `SECTIONS`: `id: "group-services"`, group
  `"Rates & Packages"`, label "Group Services", icon `UsersRound` (or existing import),
  hint "Halls · meals · decor · transfers for groups".
- **Register in `CUSTOM_SECTIONS` and add `"group-services": []` to `INITIAL_DATA`** — both
  are required (this is the exact omission that crashed Restaurant Tables).
- New `src/app/(app)/setup/group-services-manager.tsx` — CRUD grid mirroring
  `menu-items-manager.tsx`: list active+inactive; Add/Edit via a dialog (name, category
  Select, price, per-pax toggle, GST, active toggle); Delete behind a confirm. Uses
  `apiGet/apiPost/apiPut/apiDelete` on `/group-services`; local-state updates; offline-toast.
- Render line `{active === "group-services" && <GroupServicesManager onToast={showToast} />}`
  after the `food` block.

## C. Rewire `groups/new/page.tsx`

- **Remove** the `ROOM_TYPES` and `SERVICE_OPTIONS` constants.
- **Fetch on mount:** `/room-types`, `/rate-plans`, `/agents`, `/group-services`,
  `/gst-slabs` (each `apiGet`, offline-safe `.catch(()=>{})`, `Array.isArray` guard).
- **Room block:** room-type `<Select>` options come from `/room-types`; choosing a type sets
  the row rate to that type's `baseTariff` adjusted by the selected rate plan's `discountPct`
  (`rate = round(baseTariff * (1 - discountPct/100))`); the rate field stays editable.
- **Rate-plan dropdown:** options from `/rate-plans` (code/name); store the selected plan so
  its `discountPct` feeds the room-rate suggestion. Changing the plan re-suggests rates for
  rows the user hasn't manually edited (track a per-row `edited` flag; only re-suggest
  unedited rows).
- **Agent/Corporate dropdown:** when `bookedBy` is Agent or Corporate, list names from
  `/agents` (filtered by `type` where available); free-text fallback if none.
- **Services picker:** list active `/group-services`; a selected service contributes
  `price * (perPax ? totalPax : qty)`; each line's GST uses its own `gst`.
- **GST (replace `subtotal * 0.05`):** rooms use the `/gst-slabs` rate whose `[from,to]`
  band contains the per-room-night rate (fallback to the highest slab if none matches);
  services use their per-line `gst`. Total GST = room GST + Σ service GST.
- **Pure helper** `src/lib/group-pricing.ts` (node-unit-tested): given room rows (rate, qty,
  nights), selected services (price, qty/perPax, gst, totalPax), the gst-slabs, and the rate
  plan discount, returns `{ roomSubtotal, servicesSubtotal, discount, gst, grandTotal }`.
  The page renders from this; the submit payload's `total`/`advance`/`balance` use
  `grandTotal`.

## Out of scope (YAGNI)

- Seasonal/holiday multipliers on group room rates (sub-project #3).
- Editing/repricing an already-created group booking.
- Changing the group-booking persistence shape, rooming-list import, or billing-mode logic.
- Per-night variable rates (single nightly rate × nights, as today).

## Testing

- Backend feature test: `group-services` CRUD round-trips (create/list/update/delete) and
  validation (name required, gst 0–100).
- Frontend unit (node): `group-pricing.ts` — room subtotal with discount, per-pax vs flat
  services, gst-slab band matching, grand total.
- Browser (Playwright): Setup → Group Services add/edit/delete persists; `groups/new` shows
  real room types/rate plans/agents/services and the total reflects configured prices + GST
  (not the old hardcoded 5%).
