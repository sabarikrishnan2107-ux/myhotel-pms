# Capture ID type + number on the tablet and flow them back valid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the tablet "Sync to mobile app" flow carry a validated **ID type** + **ID number** end-to-end so a synced booking arrives in the web guest form with the four photos *and* a valid ID already filled in.

**Architecture:** Extend the existing verification pipe in three repos. The tablet captures ID type + number (validated before submit) and POSTs them with the four images; the backend stores them on the booking, returns them in an `identity` block, and only marks a booking `synced` once the ID number is present too; the web form auto-fills the two fields from the sync result, re-validates with a shared per-type ruleset, and gates Save.

**Tech Stack:** Next.js 16 + React 19 + vitest (web `luxe-pms`); Laravel + PHPUnit 12 on sqlite `:memory:` (backend `hotel-pms-api`); Expo / React Native 0.81 (tablet `hotelclient`, a **separate** git repo at `D:\hotelclient`).

## Global Constraints

- **Three repos, two git roots.** `luxe-pms` and `hotel-pms-api` live in this repo (`d:\transfer the file\Downloads\myhotel-pms-source`). The tablet app is a **separate git repo** at `D:\hotelclient` — commit tablet tasks there, web/backend tasks here.
- **Web tests:** `cd luxe-pms && npm run test` (runs `vitest run`). Single file: `npm run test -- src/lib/id.test.ts`.
- **Web typecheck:** `cd luxe-pms && npx tsc --noEmit`.
- **Backend tests:** `cd hotel-pms-api && C:/php84/php.exe artisan test --filter=BookingVerificationIdTest` (tests use sqlite `:memory:`; the `C:/php84/php.exe` interpreter is the project's PHP — see memory note `pgsql-php-extension-fix`).
- **Tablet has NO test runner** (only `npm run typecheck` → `tsc --noEmit`). Its `validateId` is a **verbatim port** of the unit-tested web copy; tablet tasks are gated on `npm run typecheck` plus the explicit manual assertions listed in each task.
- **Validation ruleset is one source of truth** (the table in Task 1). Both copies are identical except the web copy passes `nationality` (the tablet has none, so it always gets the lenient Passport branch).
- **Heed `luxe-pms/AGENTS.md`** ("this is NOT the Next.js you know"). Our web edits are React-only (no Next APIs), so no doc lookup is needed, but do not introduce Next API calls.
- **DRY / YAGNI / TDD / frequent commits.** Where a repo has a runner, write the failing test first.

---

### Task 1: `validateId` helper + tests (web — canonical copy)

**Files:**
- Create: `luxe-pms/src/lib/id.ts`
- Test: `luxe-pms/src/lib/id.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `validateId(idType: string, idNumber: string, nationality?: string): { ok: boolean; reason?: "required" | "format" }`. The single source of truth for ID-number validity, reused by the web form (Task 3) and ported verbatim to the tablet (Task 4).

**Ruleset (number normalized: spaces stripped, upper-cased):**

| ID type | Pattern |
|---|---|
| Aadhaar | `^\d{12}$` |
| PAN | `^[A-Z]{5}\d{4}[A-Z]$` |
| Voter ID | `^[A-Z]{3}\d{7}$` |
| Passport, `nationality === "India"` | `^[A-Z]\d{7}$` |
| Driving License | `^[A-Z0-9]{10,16}$` |
| Passport (non-India), OCI Card, PIO Card, anything else | `^[A-Z0-9]{6,}$` |

Empty number → `{ ok: false, reason: "required" }`. Non-empty but failing → `{ ok: false, reason: "format" }`.

- [ ] **Step 1: Write the failing test**

Create `luxe-pms/src/lib/id.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateId } from "@/lib/id";

describe("validateId", () => {
  it("treats an empty number as required", () => {
    expect(validateId("Aadhaar", "")).toEqual({ ok: false, reason: "required" });
    expect(validateId("Aadhaar", "   ")).toEqual({ ok: false, reason: "required" });
  });

  it("validates Aadhaar as 12 digits, ignoring spaces", () => {
    expect(validateId("Aadhaar", "1234 5678 9012").ok).toBe(true);
    expect(validateId("Aadhaar", "123456789012").ok).toBe(true);
    expect(validateId("Aadhaar", "12345").ok).toBe(false);
    expect(validateId("Aadhaar", "12345678901A").ok).toBe(false);
  });

  it("validates PAN format", () => {
    expect(validateId("PAN", "ABCDE1234F").ok).toBe(true);
    expect(validateId("PAN", "abcde1234f").ok).toBe(true); // upper-cased
    expect(validateId("PAN", "ABCDE1234").ok).toBe(false);
  });

  it("validates Voter ID format", () => {
    expect(validateId("Voter ID", "ABC1234567").ok).toBe(true);
    expect(validateId("Voter ID", "AB1234567").ok).toBe(false);
  });

  it("tightens Passport to letter+7digits only for India", () => {
    expect(validateId("Passport", "A1234567", "India").ok).toBe(true);
    expect(validateId("Passport", "AB123", "India").ok).toBe(false);
    // Foreign / unknown nationality → lenient (>=6 alphanumeric)
    expect(validateId("Passport", "X12345").ok).toBe(true);
    expect(validateId("Passport", "X1234", "USA").ok).toBe(false);
  });

  it("validates Driving License as 10-16 alphanumeric", () => {
    expect(validateId("Driving License", "MH1220110012345").ok).toBe(true);
    expect(validateId("Driving License", "SHORT12").ok).toBe(false);
  });

  it("falls back to >=6 alphanumeric for OCI/PIO/unknown", () => {
    expect(validateId("OCI Card", "A1B2C3").ok).toBe(true);
    expect(validateId("PIO Card", "12345").ok).toBe(false);
    expect(validateId("Something Else", "ABC123").ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd luxe-pms && npm run test -- src/lib/id.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/id"` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `luxe-pms/src/lib/id.ts`:

```ts
/** Result of validating a government ID number against its type's format. */
export type IdValidation = { ok: boolean; reason?: "required" | "format" };

/** Normalize for matching: strip whitespace, upper-case. */
function norm(n: string): string {
  return (n ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Validate a government ID number against its type. Strict patterns for the
 * well-known Indian IDs; a lenient alphanumeric fallback for foreign / varied
 * formats so a legitimate foreign document is never rejected. `nationality`
 * tightens Passport to the Indian format (letter + 7 digits) when "India".
 * This is the single source of truth — the tablet copy must match exactly.
 */
export function validateId(idType: string, idNumber: string, nationality?: string): IdValidation {
  const v = norm(idNumber);
  if (v === "") return { ok: false, reason: "required" };

  const GENERIC = /^[A-Z0-9]{6,}$/;
  let pattern: RegExp;
  switch (idType) {
    case "Aadhaar":
      pattern = /^\d{12}$/;
      break;
    case "PAN":
      pattern = /^[A-Z]{5}\d{4}[A-Z]$/;
      break;
    case "Voter ID":
      pattern = /^[A-Z]{3}\d{7}$/;
      break;
    case "Passport":
      pattern = nationality === "India" ? /^[A-Z]\d{7}$/ : GENERIC;
      break;
    case "Driving License":
      pattern = /^[A-Z0-9]{10,16}$/;
      break;
    default: // OCI Card, PIO Card, anything else
      pattern = GENERIC;
  }
  return pattern.test(v) ? { ok: true } : { ok: false, reason: "format" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd luxe-pms && npm run test -- src/lib/id.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add luxe-pms/src/lib/id.ts luxe-pms/src/lib/id.test.ts
git commit -m "feat(id): shared per-type ID number validator + tests"
```

---

### Task 2: Backend — store + return ID type/number, gate `synced`

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_27_120000_add_id_fields_to_bookings.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/VerificationController.php` (validate ~49-57, persist ~62-67, gate ~71-77, `mapBooking` ~121-126)
- Test: `hotel-pms-api/tests/Feature/BookingVerificationIdTest.php`

**Interfaces:**
- Consumes: existing `POST /api/bookings/{id}/verification` and `GET /api/bookings/{id}`.
- Produces: the verification endpoint now accepts `id_type` + `id_number` form fields; `mapBooking` returns `identity: { id_type, id_number }`; `verification_status` becomes `synced` only when the four docs **and** a non-empty `id_number` are present. Task 3 (web) reads `identity`; Task 6 (tablet) sends the fields.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/BookingVerificationIdTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingVerificationIdTest extends TestCase
{
    use RefreshDatabase;

    private function actingUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        return $user;
    }

    private function createBooking(): int
    {
        return $this->postJson('/api/bookings', [
            'bookingNo' => 'BK-IDV-1', 'guestName' => 'Id Guest',
            'source' => 'Direct', 'nights' => 1, 'total' => 1000, 'balance' => 0,
        ])->assertCreated()->json('id');
    }

    public function test_verification_persists_and_returns_id_type_and_number(): void
    {
        $this->actingUser();
        $id = $this->createBooking();

        $this->postJson("/api/bookings/{$id}/verification", [
            'id_type'   => 'Aadhaar',
            'id_number' => '1234 5678 9012',
        ])->assertOk();

        $this->getJson("/api/bookings/{$id}")
            ->assertOk()
            ->assertJsonPath('identity.id_type', 'Aadhaar')
            ->assertJsonPath('identity.id_number', '1234 5678 9012');
    }

    public function test_synced_requires_all_docs_and_a_non_empty_id_number(): void
    {
        $this->actingUser();
        $id = $this->createBooking();

        // Four documents but no ID number -> stays in_progress.
        $this->postJson("/api/bookings/{$id}/verification", [
            'guest_photo' => 'https://x/p.jpg',
            'id_front'    => 'https://x/f.jpg',
            'id_back'     => 'https://x/b.jpg',
            'signature'   => '<svg></svg>',
        ])->assertOk()->assertJsonPath('verification_status', 'in_progress');

        // Add the ID number -> now synced.
        $this->postJson("/api/bookings/{$id}/verification", [
            'id_type'   => 'Aadhaar',
            'id_number' => '123456789012',
        ])->assertOk()->assertJsonPath('verification_status', 'synced');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd hotel-pms-api && C:/php84/php.exe artisan test --filter=BookingVerificationIdTest`
Expected: FAIL — `identity.id_type` path missing (and the `synced` assertion fails because the gate ignores the ID number).

- [ ] **Step 3a: Create the migration**

Create `hotel-pms-api/database/migrations/2026_06_27_120000_add_id_fields_to_bookings.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Structured ID type + number captured alongside the verification documents,
 * so a tablet-synced booking carries the guest's ID details, not just images.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->string('id_type')->nullable();
            $t->string('id_number')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->dropColumn(['id_type', 'id_number']);
        });
    }
};
```

- [ ] **Step 3b: Accept the two fields in validation**

In `VerificationController.php`, extend the `$request->validate([...])` array (after the `'signature'` line) with:

```php
            'id_type'             => ['nullable', 'string'],
            'id_number'           => ['nullable', 'string'],
```

- [ ] **Step 3c: Persist the two fields**

In `store()`, immediately **after** the `foreach (['guest_photo', 'id_front', 'id_back', 'signature'] as $field) { ... }` loop that ingests documents, add:

```php
        // Structured ID details (plain strings, not files) — only overwrite when
        // a non-empty value was sent, so a docs-only push keeps any prior ID.
        foreach (['id_type', 'id_number'] as $idField) {
            $val = $data[$idField] ?? null;
            if (is_string($val) && trim($val) !== '') {
                $booking->{$idField} = trim($val);
            }
        }
```

- [ ] **Step 3d: Fold the ID number into the completeness gate**

Replace the existing status block:

```php
        $booking->verification_status = $present >= 4 ? 'synced' : ($present > 0 ? 'in_progress' : 'not_started');
```

with:

```php
        // `synced` requires all four documents AND a stored ID number, so the
        // web form only flips to "done" once the full record has arrived.
        $docsComplete = $present >= 4;
        $hasId = !empty($booking->id_number);
        $booking->verification_status = ($docsComplete && $hasId)
            ? 'synced'
            : (($present > 0 || $hasId) ? 'in_progress' : 'not_started');
```

- [ ] **Step 3e: Return the `identity` block**

In `mapBooking()`, add a sibling key right after the `'documents' => [ ... ],` array:

```php
            'identity'            => [
                'id_type'   => $b->id_type,
                'id_number' => $b->id_number,
            ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd hotel-pms-api && C:/php84/php.exe artisan test --filter=BookingVerificationIdTest`
Expected: PASS (both tests green; `RefreshDatabase` runs the new migration on the in-memory DB).

- [ ] **Step 5: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add hotel-pms-api/database/migrations/2026_06_27_120000_add_id_fields_to_bookings.php \
        hotel-pms-api/app/Http/Controllers/Api/VerificationController.php \
        hotel-pms-api/tests/Feature/BookingVerificationIdTest.php
git commit -m "feat(verification): store + return id_type/id_number, gate synced on ID"
```

---

### Task 3: Web form — auto-fill ID type/number from sync + gate Save

**Files:**
- Modify: `luxe-pms/src/components/guests/new-guest-form.tsx` (import ~13, `SyncedBooking` type 59-68, poll `setData` 161-167, `requiredOk`/`issues` 196-201, capture-done card 318-342)

**Interfaces:**
- Consumes: `validateId` from Task 1; the `identity` block from Task 2's `GET /bookings/{id}`.
- Produces: after a sync, `data.idType` / `data.idNumber` are populated and validated; Save is blocked when a non-empty ID number is invalid.

This is a React integration change with no component-test harness in the repo; it is gated on `validateId`'s unit tests (Task 1), a typecheck, and the manual smoke test below.

- [ ] **Step 1: Import the validator**

After line 13 (`import { cn } from "@/lib/utils";`) add:

```ts
import { validateId } from "@/lib/id";
```

- [ ] **Step 2: Extend the polled booking shape**

Replace the `SyncedBooking` type (lines 59-68) with:

```ts
/** Shape returned by GET /bookings/{id} (the fields this form needs). */
type SyncedBooking = {
  verification_status?: string;
  documents?: {
    guest_photo?: string | null;
    id_front?: string | null;
    id_back?: string | null;
    signature?: string | null;
  };
  identity?: {
    id_type?: string | null;
    id_number?: string | null;
  };
};
```

- [ ] **Step 3: Fill ID type + number when the sync completes**

In the polling effect, replace the `setData(prev => ({ ... }))` block (lines 161-167) with:

```ts
          setData(prev => ({
            ...prev,
            photo: d.guest_photo ?? prev.photo,
            idFront: d.id_front ?? prev.idFront,
            idBack: d.id_back ?? prev.idBack,
            signature: d.signature ?? prev.signature,
            // Structured ID captured on the tablet — keep the form default if absent.
            idType: b.identity?.id_type || prev.idType,
            idNumber: b.identity?.id_number || prev.idNumber,
          }));
```

- [ ] **Step 4: Validate + gate Save**

Replace the `requiredOk` + `issues` block (lines 196-201) with:

```ts
  // A non-empty ID number must be valid for its type; empty stays allowed so a
  // no-ID draft is still savable (ID can be captured later at check-in).
  const idCheck = validateId(data.idType, data.idNumber, data.nationality);
  const idValid = data.idNumber.trim() === "" || idCheck.ok;
  const requiredOk = !!data.name && phoneValid && emailValid && dobValid && idValid;
  const issues: string[] = [];
  if (!data.name) issues.push("name");
  if (!phoneValid) issues.push("valid phone");
  if (!emailValid) issues.push("valid email");
  if (!dobValid) issues.push("valid date of birth");
  if (!idValid) issues.push("valid ID number");
```

- [ ] **Step 5: Show a valid/invalid badge on the captured card**

In the `syncState === "done"` card, replace the trailing helper line (line 340):

```tsx
            <p className="text-[11px] text-muted-foreground mt-2">These were captured on the tablet and saved with the guest. You can still override them below.</p>
```

with:

```tsx
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              {idValid && data.idNumber.trim() !== "" ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data.idType} · {data.idNumber} verified
                </span>
              ) : data.idNumber.trim() !== "" ? (
                <span className="text-danger">{data.idType} number looks invalid — check it below.</span>
              ) : (
                <span className="text-muted-foreground">No ID number captured — add one below.</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">These were captured on the tablet and saved with the guest. You can still override them below.</p>
```

(`CheckCircle2` is already imported at line 3.)

- [ ] **Step 6: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual smoke (record the result)**

Start the app (`npm run dev` in `luxe-pms`, backend running per the `pgsql-php-extension-fix` memory). Bookings → New → enter name + phone → set ID number to `123` with type Aadhaar → confirm Save is disabled and the issues list shows "valid ID number"; clear it → Save re-enables. (Full tablet round-trip is verified in Task 6.)

- [ ] **Step 8: Commit**

```bash
cd "d:/transfer the file/Downloads/myhotel-pms-source"
git add luxe-pms/src/components/guests/new-guest-form.tsx
git commit -m "feat(guest-form): fill + validate ID type/number from tablet sync"
```

---

### Task 4: Tablet — model, validator port, capture-context identity

**Repo:** `D:\hotelclient` (separate git root).

**Files:**
- Modify: `D:\hotelclient\src\types\index.ts` (`VerificationDraft` ~87-95, `VerificationUploadFields` ~125-134)
- Create: `D:\hotelclient\src\services\idValidation.ts`
- Modify: `D:\hotelclient\src\context\CaptureContext.tsx` (`CaptureContextValue` 31-40, `begin` 47-64, provider value 81-92)

**Interfaces:**
- Consumes: nothing new.
- Produces: `validateId(idType, idNumber)` and `ID_TYPES` (tablet copy); `VerificationDraft.id_type` / `.id_number`; a `setIdentity(idType, idNumber)` action on the capture context. Tasks 5 and 6 consume these.

- [ ] **Step 1: Port the validator (verbatim ruleset)**

Create `D:\hotelclient\src\services\idValidation.ts`:

```ts
/** Result of validating a government ID number against its type's format. */
export type IdValidation = { ok: boolean; reason?: 'required' | 'format' };

/** ID types reception can pick on the tablet (flat list — nationality unknown here). */
export const ID_TYPES = [
  'Aadhaar',
  'PAN',
  'Passport',
  'Voter ID',
  'Driving License',
  'OCI Card',
  'PIO Card',
] as const;

function norm(n: string): string {
  return (n ?? '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Verbatim port of luxe-pms `src/lib/id.ts` `validateId`. The tablet has no
 * nationality context, so Passport always uses the lenient (>=6 alphanumeric)
 * branch; the web form re-tightens it for Indian guests. Keep both copies in sync.
 */
export function validateId(idType: string, idNumber: string): IdValidation {
  const v = norm(idNumber);
  if (v === '') return { ok: false, reason: 'required' };

  const GENERIC = /^[A-Z0-9]{6,}$/;
  let pattern: RegExp;
  switch (idType) {
    case 'Aadhaar':
      pattern = /^\d{12}$/;
      break;
    case 'PAN':
      pattern = /^[A-Z]{5}\d{4}[A-Z]$/;
      break;
    case 'Voter ID':
      pattern = /^[A-Z]{3}\d{7}$/;
      break;
    case 'Driving License':
      pattern = /^[A-Z0-9]{10,16}$/;
      break;
    default: // Passport, OCI Card, PIO Card, anything else
      pattern = GENERIC;
  }
  return pattern.test(v) ? { ok: true } : { ok: false, reason: 'format' };
}
```

- [ ] **Step 2: Add ID fields to the draft + upload types**

In `D:\hotelclient\src\types\index.ts`, add two fields to `VerificationDraft` (after `signature?: CapturedDoc;`):

```ts
  /** Structured ID details captured before the documents. */
  id_type?: string;
  id_number?: string;
```

and add the same two fields to `VerificationUploadFields` (after its `signature?: CapturedDoc;`):

```ts
  id_type?: string;
  id_number?: string;
```

- [ ] **Step 3: Add `setIdentity` to the capture context**

In `D:\hotelclient\src\context\CaptureContext.tsx`:

(a) Add to the `CaptureContextValue` type (after `clearDoc: (type: DocType) => void;`):

```ts
  setIdentity: (idType: string, idNumber: string) => void;
```

(b) In `begin()`, seed any ID already on the booking — add inside the `setDraft` builder, right before `return next;`:

```ts
      // Seed structured ID details already stored on the booking (resume case).
      const ident = (booking as Booking & { identity?: { id_type?: string | null; id_number?: string | null } }).identity;
      if (ident?.id_type) next.id_type = ident.id_type;
      if (ident?.id_number) next.id_number = ident.id_number;
```

(c) Add the action (after the `clearDoc` definition):

```ts
  const setIdentity = useCallback((idType: string, idNumber: string) => {
    setDraft((prev) => (prev ? { ...prev, id_type: idType, id_number: idNumber } : prev));
  }, []);
```

(d) Add `setIdentity` to the `useMemo` value object and its dependency array (alongside `clearDoc`).

- [ ] **Step 4: Typecheck**

Run: `cd /d/hotelclient && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manual assertion (validator behavior)**

The ruleset is identical to Task 1's unit-tested copy. Spot-confirm by eye that the regexes in `idValidation.ts` match the Task 1 table exactly: Aadhaar `\d{12}`, PAN `[A-Z]{5}\d{4}[A-Z]`, Voter ID `[A-Z]{3}\d{7}`, Driving License `[A-Z0-9]{10,16}`, fallback `[A-Z0-9]{6,}`. (No `nationality` branch — Passport intentionally uses the fallback here.)

- [ ] **Step 6: Commit (in the tablet repo)**

```bash
cd /d/hotelclient
git add src/services/idValidation.ts src/types/index.ts src/context/CaptureContext.tsx
git commit -m "feat(id): draft id_type/id_number + ported validator + setIdentity"
```

---

### Task 5: Tablet — `IdDetailsScreen`, register it, make it the first step

**Repo:** `D:\hotelclient`.

**Files:**
- Create: `D:\hotelclient\src\screens\IdDetailsScreen.tsx`
- Modify: `D:\hotelclient\src\navigation\types.ts` (`BookingsStackParamList`)
- Modify: `D:\hotelclient\src\navigation\BookingsStack.tsx` (register the screen)
- Modify: `D:\hotelclient\src\screens\BookingDetailsScreen.tsx` (`onPrimary` 76-83, button label 135)

**Interfaces:**
- Consumes: `validateId`, `ID_TYPES`, `setIdentity` (Task 4).
- Produces: an `IdDetails` route in `BookingsStackParamList` (`{ bookingId: string }`); the capture flow now begins on `IdDetails`.

- [ ] **Step 1: Add the route to the param list**

In `D:\hotelclient\src\navigation\types.ts`, add to `BookingsStackParamList` (after `BookingDetails: { bookingId: string };`):

```ts
  IdDetails: { bookingId: string };
```

- [ ] **Step 2: Create the screen**

Create `D:\hotelclient\src\screens\IdDetailsScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BookingsStackParamList } from '../navigation/types';
import { AppHeader, Button, Card, Screen } from '../components';
import { useCapture } from '../context/CaptureContext';
import { useTheme } from '../theme';
import { ID_TYPES, validateId } from '../services/idValidation';

type Props = NativeStackScreenProps<BookingsStackParamList, 'IdDetails'>;

export function IdDetailsScreen({ navigation, route }: Props) {
  const { bookingId } = route.params;
  const { theme } = useTheme();
  const { colors } = theme;
  const { draft, setIdentity } = useCapture();

  const [idType, setIdType] = useState<string>(draft?.id_type ?? ID_TYPES[0]);
  const [idNumber, setIdNumber] = useState<string>(draft?.id_number ?? '');

  const check = validateId(idType, idNumber);
  const showError = idNumber.trim() !== '' && !check.ok;

  const onContinue = () => {
    if (!check.ok) return;
    setIdentity(idType, idNumber.trim());
    navigation.navigate('GuestPhoto', { bookingId });
  };

  return (
    <Screen
      padded
      scroll
      header={<AppHeader title="ID Details" subtitle="Step 1 of 5" onBack={() => navigation.goBack()} />}
      footer={
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Button label="Continue" icon="arrow-forward-outline" variant="gold" disabled={!check.ok} onPress={onContinue} />
        </View>
      }
    >
      <Text style={[styles.label, { color: colors.text }]}>ID type</Text>
      <View style={styles.chips}>
        {ID_TYPES.map((t) => {
          const active = t === idType;
          return (
            <Pressable
              key={t}
              onPress={() => setIdType(t)}
              style={[
                styles.chip,
                { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>ID number</Text>
      <Card style={styles.inputCard}>
        <TextInput
          value={idNumber}
          onChangeText={(v) => setIdNumber(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Enter the ID number"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
      </Card>
      {showError ? (
        <Text style={[styles.error, { color: colors.danger }]}>
          That doesn&apos;t look like a valid {idType} number.
        </Text>
      ) : (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Used for the guest registration record. It must be valid to continue.
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  inputCard: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 16, fontWeight: '600', paddingVertical: 12, letterSpacing: 1 },
  error: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  hint: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
```

> Note: this screen uses the same `Screen` / `AppHeader` / `Card` / `Button` / `useTheme` primitives as the existing capture screens. If `colors.primary` / `colors.danger` are named differently in `src/theme`, match the names used in `BookingDetailsScreen.tsx` (it references `colors.primary`, `colors.danger`, `colors.text`, `colors.textMuted`, `colors.border`, `colors.surface`).

- [ ] **Step 3: Register the screen in the stack**

In `D:\hotelclient\src\navigation\BookingsStack.tsx`: add the import (with the other screen imports):

```tsx
import { IdDetailsScreen } from '../screens/IdDetailsScreen';
```

and register it right after the `BookingDetails` screen:

```tsx
      <Stack.Screen name="IdDetails" component={IdDetailsScreen} />
```

- [ ] **Step 4: Make ID details the first step from the booking**

In `D:\hotelclient\src\screens\BookingDetailsScreen.tsx`, add an identity check and route to `IdDetails` first. Add the import:

```tsx
import { validateId } from '../services/idValidation';
```

Replace `onPrimary` (lines 76-83) with:

```tsx
  const idDone = validateId(draft?.id_type ?? '', draft?.id_number ?? '').ok;

  const onPrimary = () => {
    if (!idDone) {
      navigation.navigate('IdDetails', { bookingId });
      return;
    }
    if (isComplete) {
      navigation.navigate('DocumentReview', { bookingId });
      return;
    }
    const next = DOC_ORDER.find((t) => !draft?.[t]) ?? 'guest_photo';
    goToDoc(next);
  };
```

And update the footer button label (line 135) so a fresh booking reads "Start Verification" until the ID is entered — replace:

```tsx
            label={isComplete ? 'Review & Submit' : captured === 0 ? 'Start Verification' : 'Continue Verification'}
```

with:

```tsx
            label={isComplete && idDone ? 'Review & Submit' : !idDone ? 'Start Verification' : 'Continue Verification'}
```

- [ ] **Step 5: Typecheck**

Run: `cd /d/hotelclient && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd /d/hotelclient
git add src/screens/IdDetailsScreen.tsx src/navigation/types.ts src/navigation/BookingsStack.tsx src/screens/BookingDetailsScreen.tsx
git commit -m "feat(capture): ID details as the first verification step"
```

---

### Task 6: Tablet — send ID fields on upload + gate the review submit

**Repo:** `D:\hotelclient`.

**Files:**
- Modify: `D:\hotelclient\src\services\verificationService.ts` (`buildVerificationForm` 35-53)
- Modify: `D:\hotelclient\src\screens\DocumentReviewScreen.tsx` (submit gate 34, 64-78)

**Interfaces:**
- Consumes: `VerificationDraft.id_type` / `.id_number` (Task 4); `validateId` (Task 4); the backend fields (Task 2).
- Produces: the multipart upload now includes `id_type` + `id_number`; the review screen blocks submit until the ID is valid.

- [ ] **Step 1: Append the ID fields to the upload body**

In `D:\hotelclient\src\services\verificationService.ts`, inside `buildVerificationForm`, after the `DOC_ORDER.forEach(...)` block and before `form.append('verification_status', 'submitted');`, add:

```ts
  if (draft.id_type) form.append('id_type', draft.id_type);
  if (draft.id_number) form.append('id_number', draft.id_number);
```

- [ ] **Step 2: Gate the review submit on a valid ID**

In `D:\hotelclient\src\screens\DocumentReviewScreen.tsx`:

(a) Add the import:

```tsx
import { validateId } from '../services/idValidation';
```

(b) After `const { draft, isComplete } = useCapture();` (line 34), add:

```tsx
  const idOk = validateId(draft?.id_type ?? '', draft?.id_number ?? '').ok;
  const canSubmit = isComplete && idOk;
```

(c) In the footer (lines 66-77), replace the warning + button with:

```tsx
          {!canSubmit ? (
            <Text style={[styles.warn, { color: colors.warning }]}>
              {!idOk
                ? 'Enter a valid ID type and number before submitting.'
                : 'Capture all four documents before submitting.'}
            </Text>
          ) : null}
          <Button
            label="Submit Verification"
            icon="cloud-upload-outline"
            variant="gold"
            disabled={!canSubmit}
            onPress={() => navigation.navigate('UploadProgress', { bookingId })}
          />
```

- [ ] **Step 3: Typecheck**

Run: `cd /d/hotelclient && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual end-to-end smoke (record the result)**

With backend running and the tablet app pointed at it (real, not mock): from the web Bookings → New → name + phone → **Sync to mobile app**. On the tablet open that booking → **Start Verification** → pick ID type + enter a valid number (e.g. Aadhaar `123456789012`) → capture the four documents → **Submit**. Back on the web form, confirm: the four images fill, the ID type + number auto-fill, the green "… verified" badge shows, and Save is enabled. Then retry with an invalid number on the tablet → confirm Continue/Submit stays disabled.

- [ ] **Step 5: Commit**

```bash
cd /d/hotelclient
git add src/services/verificationService.ts src/screens/DocumentReviewScreen.tsx
git commit -m "feat(upload): send id_type/id_number + gate submit on valid ID"
```

---

## Self-Review

**Spec coverage**

| Spec item | Task |
|---|---|
| Shared `validateId` ruleset (web canonical) | Task 1 |
| Tablet captures ID type + number, validated before submit | Tasks 4, 5 |
| Tablet posts the fields with the four images | Task 6 |
| Backend columns `id_type` / `id_number` | Task 2 (migration) |
| Backend stores + returns `identity` block | Task 2 |
| `synced` requires four docs **and** ID number | Task 2 |
| Web form fills ID type/number from the sync | Task 3 |
| Web form re-validates + gates Save | Task 3 |
| Valid/invalid badge on the captured card | Task 3 |
| Four image captures unchanged; one-sided-ID logic untouched | (no task touches them — preserved) |
| Out of scope: walk-in modal, kiosk, OCR | (not planned — correct) |

**Placeholder scan:** none — every code step shows complete content; the two repos without a relevant runner (tablet) use `npm run typecheck` + explicit manual assertions, and the web form integration step is gated on Task 1's unit tests + typecheck + a concrete manual check.

**Type consistency:** `validateId` signature is `(idType, idNumber, nationality?)` in web (Task 1, called with `data.nationality` in Task 3) and `(idType, idNumber)` on the tablet (Task 4, called with two args in Tasks 5–6) — intentional, documented. `VerificationDraft.id_type`/`.id_number` (Task 4) are the names read in Tasks 5 and 6 and appended in Task 6. Backend `identity.id_type`/`identity.id_number` (Task 2) are exactly the paths the feature test and the web `SyncedBooking.identity` (Task 3) read. `setIdentity(idType, idNumber)` (Task 4) is called with two args in Task 5. Consistent.
