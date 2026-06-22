# Real Vendor Payments (payables) — design

**Date:** 2026-06-20
**Status:** Approved (design)
**Part of:** "Make all Accounts tabs real" (sub-project 4 of 5).

## Problem
Accounts → Vendor Payments renders the hardcoded `VENDOR_BILLS` mock; "New vendor
bill" and pay actions are toasts only. Make vendor bills a real DB-backed resource
with create + record-payment, following the app's generic-resource pattern (same as
found-items / menu-items).

## Backend (generic resource `vendor-bills`)
- **Migration** `create_vendor_bills_table`: `billNo` (string), `vendor` (string),
  `category` (string, nullable), `billDate` (string), `dueDate` (string),
  `taxableValue` (integer, default 0), `gst` (integer, default 0),
  `tdsRate` (integer, default 0), `tdsAmount` (integer, default 0),
  `netPayable` (integer, default 0), `paid` (integer, default 0),
  `status` (string, default 'Draft'), timestamps.
- **Model** `App\Models\VendorBill` (`$table='vendor_bills'`, `$guarded=['id']`,
  casts the int columns to integer).
- **Register** in `ResourceController`: add `'vendor-bills' => VendorBill::class` to the
  resources map; add a validation block (the fields above with
  `string|max:255` / `integer|min:0` / `status string|max:50`); add `'vendor-bills' => ['vendor','billNo']` to the searchable map. (This auto-enables GET/POST/PUT/DELETE `/vendor-bills` via the existing generic routes.)
- No seeder — bills are entered via the UI (starts empty on prod, which is correct).

## Status model
Stored `status` ∈ Draft / Approved / Partial / Paid. "Overdue" is **derived in the UI**
(not stored): a bill is shown Overdue when `dueDate < today` and `paid < netPayable`
and status ≠ Paid. On recording a payment: `paid >= netPayable` ⇒ status `Paid`,
else `paid > 0` ⇒ `Partial`.

## Frontend (`accounts/_tabs/payables-tab.tsx`)
- Fetch `/vendor-bills` via `apiGet` on mount into state; remove the `VENDOR_BILLS` mock import.
- Render the real list (same columns as today: bill/vendor, due date, taxable/GST/TDS,
  net payable, balance, status badge with derived Overdue). KPIs (Total bills, Outstanding,
  TDS, Overdue) computed from real rows.
- **New bill** button → a modal form (mirror the app's existing modal pattern, e.g. the
  `EntryModal`/dialog style) capturing billNo, vendor, category, billDate, dueDate,
  taxableValue, gst, tdsRate; compute `tdsAmount = round(taxableValue*tdsRate/100)` and
  `netPayable = taxableValue + gst − tdsAmount`; POST `/vendor-bills` (status 'Approved'),
  prepend to the list.
- **Record payment** action (replaces the toast-only voucher button): a small prompt/
  modal to enter an amount (default = balance), `apiPut('/vendor-bills/{id}', { paid: newPaid, status })` with derived status; update the row. Keep a toast confirmation.
- Empty state when no bills.

## Out of scope
- TDS filing / challan generation (the TDS amount is captured + summed only).
- Linking bills to the `vendors` resource by FK (vendor is a free-text name, matching the mock).
- Auto-posting paid bills into `account_entries` (kept separate; can be a later enhancement).

## Verification
- Backend feature test (`VendorBillsTest`): POST a bill → 201 + persisted; GET list returns it;
  PUT paid → status transitions; validation rejects a bad payload.
- Frontend: `tsc` 0; build passes; create a bill in the UI, record a partial payment,
  see status → Partial and balance update; reload shows it persisted.
