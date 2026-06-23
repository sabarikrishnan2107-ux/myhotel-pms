# Missing Setup screens — Meal Plans, Pricing Rules, Rate Restrictions

**Date:** 2026-06-22
**Scope:** Frontend only — three new Setup manager sections over existing backend resources.
Sub-project #4 of the Setup-flow audit. No backend change.

## Goal

Make `meal-plans`, `pricing-rules`, and `rate-restrictions` configurable from **Setup**.
All three already exist as generic `ResourceController` resources (and Pricing Rules /
Rate Restrictions are editable in the Revenue module today), but none has a Setup section.
Add three simple CRUD managers mirroring the existing Setup-manager pattern
(`menu-items-manager.tsx`, `group-services-manager.tsx`).

## Backend (no change — confirm shapes)

From `ResourceController::RULES`:
- **meal-plans**: `code` (≤20), `name`, `perPaxPerDay` (int≥0), `desc` (≤500), `active`
  (bool). Required on create: `code`, `name`.
- **pricing-rules**: `name`, `trigger` (≤255|nullable), `adjustment` (≤100|nullable),
  `enabled` (bool), `scope` (≤255). Required: `name`.
- **rate-restrictions**: `fromIso` (≤50), `toIso` (≤50), `roomType` (≤50), `kind` (≤50),
  `value` (≤255), `appliedBy`/`appliedAt` (nullable), `channels` (array of string).
  Required: `kind`, `value`.

## Design — three Setup sections (group "Rates & Packages")

Each is a self-contained manager component using `apiGet/apiPost/apiPut/apiDelete`,
local-state updates, offline toasts, an Add/Edit dialog, and a confirm-gated Delete — the
same shape as `group-services-manager.tsx`. Each is wired into `setup-view.tsx` with the
**five** required touch-points: import, `SECTIONS` entry, `CUSTOM_SECTIONS` membership,
`INITIAL_DATA` key, and a render line (omitting `CUSTOM_SECTIONS`/`INITIAL_DATA` crashes the
section — the Restaurant Tables lesson).

### 1. `meal-plans-manager.tsx` — Meal Plans
Grid of plans; dialog fields: Code, Name, Per-pax/day (₹, number), Description, Active.
Section: `id: "meal-plans"`, label "Meal Plans", icon `Utensils`, hint
"EP/CP/MAP/AP · per-pax-per-day".

### 2. `pricing-rules-manager.tsx` — Pricing Rules
Grid of rules; dialog fields: Name, Trigger (text, e.g. "Occupancy > 80%"), Adjustment
(text, e.g. "+15%"), Scope (text, e.g. "All room types"), Enabled (toggle). Section:
`id: "pricing-rules"`, label "Pricing Rules", icon `Tag`, hint
"Dynamic rate adjustments · triggers".

### 3. `rate-restrictions-manager.tsx` — Rate Restrictions
Grid of restrictions; dialog fields: From (date), To (date), Room type (text/Select),
Kind (Select: Min stay / Max stay / Closed to arrival / Closed to departure / Stop sell),
Value (text), Channels (comma-separated text ↔ string[]). Required: kind + value. Section:
`id: "rate-restrictions"`, label "Rate Restrictions", icon `Calendar`, hint
"Min-stay · CTA/CTD · stop-sell".

## Out of scope (YAGNI)

- Removing or changing the existing Revenue-module editors for pricing-rules /
  rate-restrictions (both can coexist; same resource).
- Applying these in the booking/pricing flows (separate concern; seasonal pricing is #3).
- Backend changes, validation changes, or new fields.
- A room-type dropdown sourced from `/room-types` in Rate Restrictions (free text is fine
  for v1; can enhance later).

## Testing

- Frontend: `npx tsc --noEmit` + `npm run lint` + `npm run build` all clean (the new
  `SectionId`s must be exhaustively handled — proves `INITIAL_DATA` keys present).
- Browser (Playwright): each of the three Setup sections opens (no crash), adds a row that
  persists (reload shows it), edits it, and deletes it.

> No unit tests: these are list-CRUD managers with no pure computation (consistent with the
> menu-items / group-services managers, which also have none).
