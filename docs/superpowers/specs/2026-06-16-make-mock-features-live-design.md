# Make mock features live — design

**Date:** 2026-06-16
**Branch:** `feat/make-mock-features-live`

## Problem

Several sidebar features render hardcoded JavaScript constants dressed up to
look live. The transactional core (bookings, folios, payments, shifts, rate
restrictions, pricing rules) is genuinely Postgres-backed, but these areas are
not:

| Area | Frontend | Current source |
|---|---|---|
| Folio → Adjustments & Comps | `folio/[id]/page.tsx` | `SAMPLE_ADJUSTMENTS` constant |
| Folio → e-Invoice Compliance | `folio/[id]/page.tsx` | IRN/ACK computed in JS, never stored |
| Folio → Guest KYC | `folio/[id]/page.tsx` | hardcoded "Verified / dates" |
| Accounts → dashboards | `accounts/page.tsx` | `INCOME_BREAKDOWN`, `EXPENSE_BREAKDOWN`, `RECENT_TXN` from `mock-data-ext.ts` |
| Competitor Rate Shop | `revenue/comp-shop/page.tsx` | fully hardcoded competitors + rates, buttons are toasts |
| Group Pricing | `revenue/group-quote/page.tsx` | `FB_PLANS`, `BANQUET_PKGS`, `BANQUET_VENUES` constants |

## Goal

Make all six DB-backed and fully interactive (CRUD), following the existing
conventions:

- camelCase columns, `protected $guarded = ['id']` models, JSON casts.
- Generic CRUD via `ResourceController` (`MODELS` / `RULES` /
  `REQUIRED_ON_CREATE`, optional `FILTER_BY`).
- Seeders carry the current hardcoded values so the UI looks identical but is
  now driven by the DB ("seeder = real data, not mock").
- Frontend uses `apiGet/apiPost/apiPut/apiDelete` from `@/lib/api`.

## Scope decisions (confirmed with user)

- **All four mock areas**, fully interactive CRUD.
- Two areas depend on external services that we will **stub behind real
  tables** (work end-to-end now, swap to a provider later):
  - **e-Invoice IRN/ACK** generated locally from real folio totals + GSTIN,
    **not** issued by the government NIC portal. Labeled as such in the UI.
  - **Competitor rates** entered/seeded manually, **not** scraped from OTAs.
    The "re-scrape" action refreshes from the DB and is labeled manual.
- **Group Pricing** reuses existing `fb-packages` (banquet catering packages)
  and `hall-packages` (venues); only meal plans get a new table.

## Design

### A. Folio — Adjustments & Comps `[new table]`

- New table `folio_adjustments`, resource slug `folio-adjustments`, filtered by
  `bookingNo` (add to `FILTER_BY`).
- Columns: `bookingNo` (string, indexed), `date` (string), `type` (string:
  `Discount` | `Comp`), `description` (string), `amount` (integer, signed −ve),
  `approver` (string, nullable).
- `RULES['folio-adjustments']`; `REQUIRED_ON_CREATE = ['bookingNo','type','amount']`.
- Frontend `folio/[id]/page.tsx`:
  - Load via `apiGet('/folio-adjustments?bookingNo=…')`.
  - Add/delete adjustment UI (`apiPost`/`apiDelete`).
  - `adjustmentsTotal` sums real rows; feeds Grand Total and the
    "Adjustments / Comps" summary line. Remove `SAMPLE_ADJUSTMENTS`.

### B. Folio — Guest KYC `[reuse + 3 columns]`

- Migration adds to `guests`: `kycVerified` (boolean, default false),
  `kycVerifiedAt` (string, nullable), `kycVerifiedBy` (string, nullable).
  Reuse existing `idType` / `idNumber`.
- Frontend: "Verify KYC" form captures `idType` + `idNumber`, then
  `apiPut('/guests/{id}', { idType, idNumber, kycVerified:true, kycVerifiedAt,
  kycVerifiedBy })`. Panel renders real values; the "Verified" badge reflects
  `kycVerified`. "Hotel Register" no. stays derived from `bookingNo`.

### C. Folio — e-Invoice `[new table, stubbed external]`

- New table `einvoices`, resource slug `einvoices`, filtered by `bookingNo`.
  Columns: `bookingNo`, `irn` (string, nullable), `ackNo` (string, nullable),
  `ackDate` (string, nullable), `status` (string: `draft`|`generated`),
  `placeOfSupply` (string, nullable), `recipientGstin` (string, nullable),
  `reverseCharge` (boolean, default false), `signedJson` (json, nullable).
- "Generate e-Invoice" → `POST /einvoices`: server computes a deterministic
  IRN/ACK from the real folio totals + property GSTIN, builds the signed-JSON
  payload, stores the row with `status='generated'`. "Download Signed JSON" and
  "View QR" read the stored row.
- UI label: "Locally generated — not NIC-issued". This is the integration
  swap-in point for a real GST Suvidha Provider.

### D. Accounts — dashboards `[aggregation endpoint, no new table]`

- New `GET /accounts/summary?from&to` on `StatsController`, aggregating the real
  `account_entries` table:
  - `income`: `[{ category, value }]` — sum of `amount` where `type='income'`,
    grouped by `category`.
  - `expense`: `[{ category, value }]` — same for `type='expense'`.
  - `recent`: latest N entries `[{ id, date, desc, type, amount }]`.
- Frontend `accounts/page.tsx` renders from this endpoint; remove the three
  `mock-data-ext` imports.

### E. Competitor Rate Shop `[2 new tables, stubbed scraper]`

- New table `competitors`: `hotel`, `brand` (nullable), `km` (numeric),
  `stars` (integer), `source` (string), `active` (boolean). Resource slug
  `competitors`.
- New table `competitor_rates`: `competitorId` (string, indexed), `date`
  (string), `roomType` (string), `rate` (integer). Resource slug
  `competitor-rates`, filtered by `competitorId`.
- Full CRUD: add/edit competitors, enter/edit rates. "Your rate" derived from
  existing room-type/rate data. "Re-scrape" refreshes from DB (labeled manual;
  no live OTA fetch).
- Seed the current 5 competitors (`westin`, `trident`, `sahara`, `hyatt`,
  `sofitel`) + a window of rates so the page is populated on first load.

### F. Group Pricing `[1 new table + reuse]`

- New table `meal_plans`: `code` (string: EP|CP|MAP|AP|BQ), `name`,
  `perPaxPerDay` (integer), `desc` (string, nullable), `active` (boolean).
  Resource slug `meal-plans`. Seeded with current `FB_PLANS` values.
- Reuse `fb-packages` for banquet catering packages and `hall-packages` for
  venues — seed any missing rows to match current `BANQUET_PKGS` /
  `BANQUET_VENUES`.
- Frontend `group-quote/page.tsx` loads meal plans, fb-packages, hall-packages
  via `apiGet`. Quote math stays client-side; "create group booking" already
  posts to `/group-bookings` (unchanged).

## Cross-cutting

- One migration per new table; one migration for the KYC columns. Migration
  names follow the `YYYY_MM_DD_HHMMSS_create_*_table.php` convention with dates
  after the latest existing migration (`2026_06_13_*`).
- Register each new resource in `ResourceController`: `MODELS`, `RULES`,
  `REQUIRED_ON_CREATE`, and `FILTER_BY` where listed.
- One seeder per new table, wired into `DatabaseSeeder`. Seeders are idempotent
  (`updateOrCreate`/`firstOrCreate` or guarded by count) so re-running is safe.
- Each workstream (A–F) is independent and individually testable.

## Out of scope

- Real GST Suvidha Provider / NIC e-Invoice integration (stubbed).
- Live OTA rate scraping / rate-shopping feed (manual entry).
- New permission/RBAC rules beyond the existing auth:sanctum gate.

## Testing

- Backend: per-resource feature tests hitting the API (list/create/update/
  delete) under `tests/`, plus an aggregation test for `/accounts/summary` and
  an e-Invoice generation test asserting a row is persisted with `status` and a
  non-empty `irn`.
- Frontend: verify each page loads from the API (no remaining mock imports);
  manual smoke per page.
