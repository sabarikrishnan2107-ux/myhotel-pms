# Capture ID type + ID number on the tablet and flow them back valid — design

**Date:** 2026-06-27
**Status:** Awaiting review
**Spans three repos:** `luxe-pms` (web, this repo), `hotel-pms-api` (backend, this repo), `hotelclient` (tablet app, separate repo at `D:\hotelclient`)

## Problem

The new-booking guest form ("Identification & Captures" section) can push a
booking to the tablet so reception captures the guest's **face photo, ID
front, ID back and signature** on the Hotel Client app; those four images flow
back and auto-fill the form ("Sync to mobile app").

What does **not** flow back is the structured **ID type** and **ID number**.
The tablet never captures them, the `bookings` table has no columns for them,
and the backend's verification payload omits them. So after a sync the form's
**ID type** dropdown is still on its default (`Aadhaar`) and the **ID number**
box is empty — the operator must retype them by hand, and nothing checks they
are valid.

Reception wants: when the tablet capture completes, the booking comes back with
the four images **and** a valid ID type + ID number already filled in.

## Decision (agreed)

Extend the existing sync pipe to carry two more fields end-to-end:

- **Tablet** captures ID type + ID number (validated before submit) and posts
  them alongside the four images.
- **Backend** stores them on the booking, returns them to the web form, and
  only marks a booking `synced` once the ID number is present too.
- **Web form** fills the ID type + ID number from the sync result, re-validates
  the number against a per-type ruleset, and blocks save on an invalid number.

The four image captures stay exactly as they are. The one-sided-ID / "skip the
back" logic is **not** touched (possible fast-follow). Only the
`bookings/new` guest-form path is in scope; the Express Walk-in modal and
check-in kiosk reuse the same backend and can be extended later for near-zero
cost.

## Data flow

```
Tablet (hotelclient)            Backend (hotel-pms-api)          Web form (luxe-pms)
─ pick ID type                  ─ store id_type / id_number      ─ poll GET /bookings/{id}
─ type ID number  ──POST──►       on the booking      ──GET──►   ─ fill data.idType + idNumber
─ validate format (blocks)      ─ return `identity` block        ─ re-validate, gate Save
─ capture 4 photos              ─ `synced` only when complete    ─ valid/invalid badge
```

## The shared validation ruleset (`validateId`)

A pure function `validateId(idType, idNumber, nationality?) → { ok: boolean; reason?: string }`.
Strict regex for well-known Indian IDs; a lenient fallback for foreign or
varied formats so we never reject a legitimate foreign document.

| ID type | Rule (number, spaces stripped, upper-cased) |
|---|---|
| Aadhaar | `^\d{12}$` (12 digits) |
| PAN | `^[A-Z]{5}\d{4}[A-Z]$` (e.g. `ABCDE1234F`) |
| Voter ID | `^[A-Z]{3}\d{7}$` (e.g. `ABC1234567`) |
| Passport (nationality India) | `^[A-Z]\d{7}$` (letter + 7 digits) |
| Driving License | `^[A-Z0-9]{10,16}$` (≥10 alphanumeric) |
| OCI Card / PIO Card / Driving License (Intl.) / Passport (foreign) | `^[A-Z0-9]{6,}$` (≥6 alphanumeric) |
| anything else | fallback: `^[A-Z0-9]{6,}$` |

Notes:
- Empty number → `ok: false` (`reason: "required"`). The web form treats an
  empty number as "not yet entered" for its own save gate (see below); the
  tablet treats it as "can't submit".
- The ruleset is **duplicated** in `luxe-pms` and `hotelclient` — they are
  separate codebases with no shared module. Both copies must stay in sync; each
  gets the same unit tests. The table above is the single source of truth.

## 1. Tablet app — `D:\hotelclient`

### Types (`src/types/index.ts`)
- Add `id_type?: string` and `id_number?: string` to `VerificationDraft`.
- Add `id_type` + `id_number` to `VerificationUploadFields`.
- Add a `validateId` helper (mirrors the table above) — new file
  `src/services/idValidation.ts` with unit tests.

### Capture context (`src/context/CaptureContext.tsx`)
- Add a `setIdentity(idType: string, idNumber: string)` action that patches the
  draft. Seed `id_type` / `id_number` in `begin()` from the incoming
  `booking.identity` if the backend already has them (so a resumed booking
  pre-fills), mirroring how `documents` are seeded today.

### New screen `IdDetailsScreen` (`src/screens/IdDetailsScreen.tsx`)
- ID type picker + ID number text input. Live per-type validation via
  `validateId`; the "Continue" button is disabled until valid.
- Registered in `BookingsStackParamList` / the bookings navigator.

### Flow wiring (`src/screens/captureFlow.ts`, `BookingDetailsScreen.tsx`)
- Entry point: from `BookingDetailsScreen`, the capture flow starts at
  `IdDetails` (ID type + number first) and then proceeds into the existing
  document captures. The chosen ID type is therefore known before the ID
  photos are taken.
- `nextDestination` is unchanged for documents; `IdDetails` simply precedes the
  `DOC_ORDER` sequence. Review/submit are gated on identity being valid in
  addition to the four docs (`isDraftComplete` stays about docs; add an
  `isIdentityValid(draft)` check used by the review screen's submit button).

### Upload (`src/services/verificationService.ts`)
- `buildVerificationForm` appends `id_type` and `id_number` (plain string form
  fields) to the multipart body when present.

## 2. Backend — `hotel-pms-api`

### Migration (new, dated 2026_06_27)
- `bookings`: add nullable `id_type` (string) and `id_number` (string),
  alongside the existing verification columns from
  `2026_06_26_120000_add_verification_to_bookings.php`.

### `VerificationController@store`
- Extend `$request->validate([...])` with `'id_type' => ['nullable','string']`
  and `'id_number' => ['nullable','string']`.
- Persist both onto the booking when present (direct attribute assignment, same
  as the document fields — no mass-assignment change needed).
- **Completeness gate:** today `synced` requires the four document fields. Add
  "ID number present" to the gate: a booking becomes `synced` only when all
  four docs **and** a non-empty `id_number` are stored; otherwise it stays
  `in_progress` (or `not_started`). This is what makes the web form flip to
  "done" only once the full record — images + ID — has arrived.

### `VerificationController::mapBooking`
- Add a sibling block next to `documents`:
  `'identity' => ['id_type' => $b->id_type, 'id_number' => $b->id_number]`.

(The `Booking` model needs no fillable change — `mapBooking` reads attributes
directly and `store` assigns them directly, matching the existing doc fields.)

## 3. Web form — `luxe-pms/src/components/guests/new-guest-form.tsx`

### New helper `src/lib/id.ts`
- `validateId(idType, idNumber, nationality?)` per the table above, plus unit
  tests in `src/lib/id.test.ts`.

### Polled shape + sync handler
- Extend the local `SyncedBooking` type with
  `identity?: { id_type?: string | null; id_number?: string | null }`.
- In the polling effect, when `verification_status === "synced"`, additionally
  set `idType` (only if the server provided one) and `idNumber` from
  `b.identity`. These remain user-overridable, exactly like the images today.

### Validation + save gate
- Compute `idValid = data.idNumber.trim() === "" || validateId(data.idType,
  data.idNumber, data.nationality).ok`. (Empty stays allowed pre-capture so the
  form is still savable for a no-ID draft — unchanged behavior.)
- Add `idValid` to `requiredOk`, and add an `"valid ID number"` entry to the
  `issues` list when a non-empty number fails validation.
- In the "Captured from tablet" success card, show a small valid/invalid badge
  next to the ID number, and surface the failure `reason` inline when invalid.

## Error handling

- **Tablet:** invalid or empty ID number disables Continue / Submit — a bad ID
  can never be synced. Network/upload failures keep the existing offline-queue
  retry behavior unchanged.
- **Backend:** both fields nullable and `nullable` in validation, so a partial
  push (images only, no ID yet) is still accepted and simply stays
  `in_progress`.
- **Web form:** an invalid ID number (manually entered, or — defensively — a
  bad value from the server) blocks save and is flagged in the issues list and
  the capture card.

## Testing

- **`validateId` (both repos):** unit tests covering each ID type with a valid
  and an invalid sample, plus empty-string and foreign-fallback cases.
- **Backend feature test:** POST to `/bookings/{id}/verification` with
  `id_type` + `id_number` persists them and returns them in `identity`; assert
  `synced` is reached only when the four docs **and** the ID number are present
  (four docs + empty ID → `in_progress`).
- **Manual:** Bookings → New → enter name + phone → Sync to mobile app →
  on the tablet pick ID type + enter a valid number + capture four docs →
  submit → confirm the web form's ID type + ID number auto-fill, show the valid
  badge, and the booking saves.

## Out of scope

- One-sided IDs skipping the ID-back capture (kept as-is).
- The Express Walk-in modal and check-in kiosk (reuse the same backend; later).
- OCR-deriving the ID number from the ID-front image.
- Any change to the four existing image captures.
