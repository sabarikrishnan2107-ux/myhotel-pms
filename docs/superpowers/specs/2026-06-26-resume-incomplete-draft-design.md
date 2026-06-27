# Resume Incomplete Draft Bookings — Design

**Date:** 2026-06-26
**Status:** Approved design → implementation plan next
**Scope:** Make mobile-sync draft bookings appear as resumable "Incomplete" reservations instead of misleading complete ones. Apps: `hotel-pms-api` (Laravel) + `luxe-pms` (Next.js). Targets `origin/main` (where the mobile-sync feature lives), then deploys.

## 1. Background / current state

- The New Booking wizard's **"Sync to mobile app"** button (`requestMobileSync`, `luxe-pms/src/app/(app)/bookings/new/page.tsx`) POSTs a booking immediately so the tablet can capture the guest's documents. It is created with `status: "pending"` and **default/provisional** values: dates default to today → today+3, `roomType`/`ratePlan` are empty (sync happens at step 1), so `total` is a fallback default. Only the guest's **name** is persisted (as `guestName`); the rest of the step-1 form (phone, email, address, nationality, DOB, gender, ID type/number, company, GST, VIP, remarks) is **not** saved. Captured documents (ID front/back, photo, signature) are POSTed separately to `/bookings/{id}/verification`.
- The final **Confirm booking** step `apiPut`s the same draft (when `syncBooking` is set) to `status: "confirmed"`, creating the guest record then.
- The bookings list (`luxe-pms/src/app/(app)/bookings/page.tsx`) derives a lifecycle state in `deriveState`. It handles `cancelled`/`checked-in`/`checked-out`/`no-show` explicitly, but **not `pending`** — so a pending draft falls through to date-derivation: `if (r.checkIn <= today && r.checkOut > today) return "checked-in"`. Because the draft's default dates straddle today, the draft is wrongly shown as **"Checked-in"** with its provisional date/price.
- `bookings` is a generic resource via `ResourceController` (`MODELS['bookings']`), `Booking` model uses `$guarded = ['id']` (mass-assignable).

## 2. Goal

A mobile-sync draft that is not yet completed shows in the bookings list as **"Incomplete"** (not "Checked-in"), with its provisional date/nights/price **dashed** (`—`) so nothing misleading appears, and a **"Complete →"** action. Completing it **reopens the New Booking wizard pre-filled with everything the user typed plus the submitted proof**, so they review and Confirm — promoting the same draft (no duplicate).

## 3. Data model (one additive migration)

- Add a nullable JSON column `draftData` to `bookings` (`json`/`text`, default `null`). Holds the step-1 guest profile fields that are not already booking columns:
  `{ name, phone, email, address, nationality, dob, gender, idType, idNumber, company, gst, vip, remarks }`.
- Captures (ID front/back, photo, signature) are **not** duplicated here — they remain on the booking via the existing `/verification` documents flow.
- `ResourceController` `bookings` validation: allow `'draftData' => 'array|nullable'` (and ensure it round-trips via index/show). `Booking` casts `draftData` to `array`.
- A `null` `draftData` means "not a resumable draft" (back-compatible: existing pending rows simply have nothing to rehydrate beyond their columns).

## 4. Bookings list — "Incomplete" state (`bookings/page.tsx`)

- `deriveState`: add `if (status === "pending") return "incomplete";` **before** the date-derivation fallback.
- Extend `BookingState` with `"incomplete"`; add `STATE_TONE["incomplete"]` (e.g. `warning`) and `STATE_LABEL["incomplete"] = "Incomplete"`.
- For an incomplete row:
  - Render **check-in/out, nights, and amount as `—`** (the stored values are provisional).
  - Primary action is **"Complete →"** linking to `/bookings/new?resume=<bookingNo>`; clicking the row navigates there too.
  - Hide Check-in / Folio actions (not valid until confirmed); keep **Cancel**.
- Exclude `incomplete` drafts from real KPIs (occupancy / in-house counts) and from any "today's arrivals" lists, same as they're already excluded from Arrivals.

## 5. Sync — persist the full step-1 data (`bookings/new/page.tsx` `requestMobileSync`)

- When POSTing the pending booking, also send `draftData` = the current step-1 `NewGuestData` text fields (exclude the four base64 capture fields — those go to `/verification`).
- No other change to the sync/poll behavior.

## 6. Resume the wizard — `/bookings/new?resume=<bookingNo>`

- On mount, if `resume` is present: `GET /bookings` (or show) → find the booking by `bookingNo`; if `status === "pending"`:
  - Rehydrate **step-1 guest form** from `draftData` (merge over `EMPTY`).
  - Rehydrate **dates/room/rate/pax** from the booking columns (`checkIn`, `checkOut`, `roomType`, `ratePlan`, `adults`, `children`).
  - Rehydrate **captures** (ID front/back, photo, signature) from the booking's verification `documents`.
  - Set the wizard's `syncBooking = { id, bookingNo }` so the existing Confirm path **PUTs this same draft** instead of POSTing a new one.
  - Enter the wizard in "create new guest" mode with the form populated; the user can edit any field, pick the real room/dates/rate, and proceed.
- If the booking isn't found or is no longer `pending` (already confirmed/cancelled), ignore the param and start a normal booking (optionally toast "That draft was already completed").

## 7. Confirm / cleanup

- Final **Confirm** runs the existing create-guest → save-booking flow, PUTs the draft to `status: "confirmed"`, and sets `draftData: null` (clears the resume payload). No duplicate booking (same id reused via `syncBooking`).
- Abandoned drafts stay **"Incomplete"** until completed or cancelled. (No auto-expiry in this scope.)

## 8. Error handling / edge cases

- `resume` for a missing / already-confirmed / cancelled booking → start fresh (don't crash; optional toast).
- `draftData` null/partial → merge over `EMPTY`; missing fields stay default.
- Captures absent → capture slots simply empty.
- Provisional values must never count as real revenue/occupancy — guaranteed by excluding `incomplete` from KPIs and by dashing the displayed figures.
- Back-compatible: existing `pending` rows (pre-`draftData`) show as Incomplete and resume with whatever columns/docs exist.

## 9. Testing

**Backend:**
- Migration adds nullable `draftData` to `bookings`; existing rows = null.
- `POST/PUT /api/bookings` accepts + persists `draftData` (array) and it round-trips via index/show.

**Frontend (manual / build):**
- Sync a new guest at step 1 → a `pending` booking with `draftData` is created; bookings list shows it as **Incomplete** with `—` date/price and a **Complete** action (not "Checked-in").
- Click **Complete** → wizard opens pre-filled with the typed guest fields + the captured proof; pick room/rate, Confirm → the **same** booking flips to `confirmed` (no duplicate), `draftData` cleared, now shows as a normal reservation.
- Resume a confirmed/cancelled booking via crafted URL → starts fresh, no crash.

## 10. Out of scope

- Auto-expiring or purging abandoned drafts.
- Drafts for the normal (non-mobile-sync) wizard flow — nothing is POSTed there, so there's no server draft to resume.
- Changing the mobile app's capture/verification contract.

## 11. File touch-list

- `hotel-pms-api/database/migrations/2026_06_26_xxxxxx_add_draft_data_to_bookings.php` — nullable `draftData` json.
- `hotel-pms-api/app/Models/Booking.php` — `draftData` array cast (confirm `$guarded`).
- `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` — `bookings` validation: `draftData` array|nullable.
- `hotel-pms-api/tests/Feature/BookingDraftDataTest.php` — round-trip test.
- `luxe-pms/src/app/(app)/bookings/page.tsx` — `deriveState` pending→incomplete; state tone/label; dashed fields; Complete action; KPI exclusion.
- `luxe-pms/src/app/(app)/bookings/new/page.tsx` — send `draftData` on sync; `?resume=` rehydration; clear `draftData` on Confirm.
