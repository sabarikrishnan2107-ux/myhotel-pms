# Live Face Photo & Digital Signature Capture — Design

**Date:** 2026-06-12
**Status:** Approved

## Problem

The check-in KYC step has "Live face photo" and "Digital signature" tiles that are
mocked: clicking them just sets a placeholder string (`"data:face"` /
`"data:signature"`). No webcam opens, nothing is drawn, and none of the captured
KYC is saved to the database. We need real capture (webcam for the face, draw-to-sign
for the signature, with an upload fallback for the photo) persisted to the guest record.

This affects two flows:
1. **Front-desk check-in modal** — `luxe-pms/src/app/(app)/checkin/page.tsx`
2. **Kiosk self-check-in** — `luxe-pms/src/app/(app)/checkin/kiosk/[bookingNo]/page.tsx`

## What already exists (reused, not rebuilt)

- `luxe-pms/src/components/guests/photo-capture.tsx` — `PhotoCapture`: opens the
  webcam (`getUserMedia`, face-align oval, optional Shape-Detection face crop),
  "Capture" produces a base64 JPEG, with an Upload fallback and an error state that
  falls back to upload when the camera is unavailable. Calls `onChange(dataUrl|null)`.
- `luxe-pms/src/components/guests/signature-pad.tsx` — `SignaturePad`: canvas
  draw-to-sign (mouse/touch), produces a base64 PNG via `onChange(dataUrl|null)`.
- Backend: the `guests` table already has `idFront`, `idBack`, `photo`, `signature`
  (TEXT, base64 data URLs) plus generic CRUD (`GET/POST/PUT /guests`,
  `PUT /guests/{id}`). The New Guest form and `bookings/new` already persist KYC
  this way. **No backend change is needed.**

## Design

### Front-desk modal (`checkin/page.tsx`)
- Replace the two mocked `KYCCaptureSlot` tiles in the `!idOnFile` branch with
  `PhotoCapture` (label "Live face photo", square) and `SignaturePad`. State
  `facePhoto` / `signature` now hold real base64 data URLs. The existing
  `kycComplete` gate already requires both non-null, so "Next" stays disabled until
  a real capture exists.
- Persist on completion: in `handleComplete`, when KYC was collected (`!idOnFile`),
  `GET /guests`, find the guest by `reservation.guestName`, and `PUT /guests/{id}`
  with `{ idType, idNumber, idFront, idBack, photo, signature }`. Best-effort/silent
  on failure, matching the existing `persistCheckIn` pattern.

### Kiosk (`checkin/kiosk/[bookingNo]/page.tsx`)
- Replace the mocked `CameraTile` ID tiles and fake signature SVG with `PhotoCapture`
  (ID front/back + face) and `SignaturePad`. Store real base64 in component state.
- Extend `persistKioskCheckIn` to also `PUT /guests/{id}` with the captured
  `idFront/idBack/photo/signature` for the booking's guest.

### Data flow
`webcam / canvas → base64 data URL → React state → PUT /guests/{id} → Postgres TEXT`.

## Constraints / trade-offs
- `getUserMedia` requires a secure context (localhost or https). On plain-http LAN
  IPs the browser blocks the camera; `PhotoCapture` already detects this and exposes
  the Upload fallback. This satisfies the "live photo or upload photo" requirement.
- Base64-in-DB is kept for consistency with existing KYC persistence. A blob/file
  store would be lighter but diverges from current patterns; out of scope.

## Out of scope
- Changing the storage format to file/object storage.
- Server-side image validation / liveness detection beyond the existing client crop.
