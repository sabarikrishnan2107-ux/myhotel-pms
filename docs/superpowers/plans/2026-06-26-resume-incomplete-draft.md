# Resume Incomplete Draft Bookings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile-sync draft bookings show as resumable "Incomplete" reservations (not misleading "Checked-in" ones), and let the user reopen the New Booking wizard pre-filled with everything they typed plus the submitted proof, then Confirm to promote the same draft.

**Architecture:** Persist the step-1 guest profile as a nullable `draftData` JSON column on `bookings` at sync time (captures stay on the booking via the existing `/verification` flow). The bookings list maps `status:"pending"` → an `"incomplete"` state (dashed figures + a "Complete →" action). The wizard reads `?resume=<bookingNo>`, rehydrates the guest form + dates/room/pax + captures, sets `syncBooking` so Confirm PUTs the same draft and clears `draftData`.

**Tech Stack:** Laravel `hotel-pms-api` (PHP 8.4 via `C:\php84\php.exe`, PostgreSQL `hotel_pms`, PHPUnit/sqlite), Next.js `luxe-pms` (tsc + `npm run build`).

## Global Constraints

- Run artisan/tests with `"C:/php84/php.exe" artisan ...` in `hotel-pms-api`. Branch = `feat/resume-incomplete-draft` (off `origin/main`).
- New column is camelCase: `draftData`, `json` nullable default null (back-compatible — existing rows null).
- `Booking` uses `$guarded = ['id']` (mass-assignable); add `draftData` to `$casts` as `array`.
- Drafts are `status:"pending"` (already used + excluded from Arrivals). Mobile-sync is the ONLY flow that POSTs a booking early — no other flow creates server drafts.
- Captures (id front/back, photo, signature) are NEVER duplicated into `draftData`; they live on the booking via `/bookings/{id}/verification` and read back from `GET /bookings/{id}` `documents`.
- Frontend verified via `npx tsc --noEmit` + `npm run build`; backend via PHPUnit.

---

## File Structure

- `hotel-pms-api/database/migrations/2026_06_26_140000_add_draft_data_to_bookings.php` — nullable `draftData` json (new).
- `hotel-pms-api/app/Models/Booking.php` — add `draftData` array cast (modify).
- `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` — `bookings` validation: allow `draftData` (modify ~line 296-302).
- `hotel-pms-api/tests/Feature/BookingDraftDataTest.php` — round-trip test (new).
- `luxe-pms/src/app/(app)/bookings/page.tsx` — `incomplete` state, dashed cells, Complete action, KPI/ revenue exclusion (modify).
- `luxe-pms/src/components/guests/new-guest-form.tsx` — optional `initialData` prop to pre-fill (modify).
- `luxe-pms/src/app/(app)/bookings/new/page.tsx` — send `draftData` on sync; `?resume=` rehydration; clear `draftData` on Confirm (modify).

---

## Task 1: Backend — `draftData` column + validation + cast

**Files:**
- Create: `hotel-pms-api/database/migrations/2026_06_26_140000_add_draft_data_to_bookings.php`
- Modify: `hotel-pms-api/app/Models/Booking.php`
- Modify: `hotel-pms-api/app/Http/Controllers/Api/ResourceController.php` (the `'bookings' => [...]` block, ~line 296)
- Test: `hotel-pms-api/tests/Feature/BookingDraftDataTest.php`

**Interfaces:**
- Produces: `bookings.draftData` (json, nullable); `POST/PUT /api/bookings` accept + persist `draftData` (array); it round-trips via index/show as an object.

- [ ] **Step 1: Write the migration**

`2026_06_26_140000_add_draft_data_to_bookings.php`:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('bookings', function (Blueprint $t) {
            if (!Schema::hasColumn('bookings', 'draftData')) $t->json('draftData')->nullable();
        });
    }
    public function down(): void {
        Schema::table('bookings', function (Blueprint $t) {
            if (Schema::hasColumn('bookings', 'draftData')) $t->dropColumn('draftData');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

Run: `cd hotel-pms-api && "C:/php84/php.exe" artisan migrate`
Verify: `"C:/php84/php.exe" artisan tinker --execute="echo \Illuminate\Support\Facades\Schema::hasColumn('bookings','draftData')?'yes':'no';"` → `yes`.

- [ ] **Step 3: Add the cast to the model**

In `app/Models/Booking.php`, add `'draftData'=>'array'` to `$casts`:
```php
    protected $casts = ['vip'=>'boolean','nights'=>'integer','adults'=>'integer','children'=>'integer','total'=>'integer','advance'=>'integer','balance'=>'integer','draftData'=>'array'];
```

- [ ] **Step 4: Write the failing test**

`tests/Feature/BookingDraftDataTest.php`:
```php
<?php
use App\Models\User;

class BookingDraftDataTest extends \Tests\TestCase {
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    private function owner(): User {
        return User::create(['name' => 'O', 'email' => 'bk@a.com', 'password' => 'x', 'role' => 'Owner', 'company_id' => 902]);
    }

    public function test_booking_accepts_and_persists_draft_data(): void {
        $this->actingAs($this->owner(), 'sanctum');
        $this->postJson('/api/bookings', [
            'bookingNo' => 'BK900001', 'guestName' => 'Kumar', 'source' => 'Corporate',
            'adults' => 2, 'children' => 0, 'status' => 'pending',
            'draftData' => ['name' => 'Kumar', 'phone' => '+91 9876543210', 'email' => 'k@x.com', 'idType' => 'Aadhaar'],
        ])->assertSuccessful();

        $row = collect($this->getJson('/api/bookings')->json())->firstWhere('bookingNo', 'BK900001');
        $this->assertSame('+91 9876543210', $row['draftData']['phone']);
        $this->assertSame('Aadhaar', $row['draftData']['idType']);
    }
}
```
(If `/api/bookings` requires more fields or a different success code, adapt to the real ResourceController contract — keep the assertions on `draftData` round-tripping as a nested object.)

- [ ] **Step 5: Run to verify it fails**

Run: `"C:/php84/php.exe" artisan test --filter=BookingDraftDataTest`
Expected: FAIL — `draftData` is stripped by validation (assertion on `phone` fails / key missing).

- [ ] **Step 6: Add the validation rule**

In `ResourceController.php`, append to the `'bookings' => [...]` array (after the `status` line):
```php
            'draftData' => 'array|nullable',
```

- [ ] **Step 7: Run to verify pass + full suite**

Run: `"C:/php84/php.exe" artisan test --filter=BookingDraftDataTest` → PASS.
Run: `"C:/php84/php.exe" artisan test` → suite green.

- [ ] **Step 8: Commit**

```bash
git add hotel-pms-api/database/migrations hotel-pms-api/app/Models/Booking.php hotel-pms-api/app/Http/Controllers/Api/ResourceController.php hotel-pms-api/tests/Feature/BookingDraftDataTest.php
git commit -m "feat(api): bookings.draftData json column for resumable drafts"
```

---

## Task 2: Bookings list — "Incomplete" state, dashed figures, Complete action

**Files:**
- Modify: `luxe-pms/src/app/(app)/bookings/page.tsx`

**Interfaces:**
- Consumes: backend `status:"pending"` on draft bookings.
- Produces: an `"incomplete"` `BookingState` rendered with a warning badge, dashed date/nights/amount, and a `Complete →` link to `/bookings/new?resume=<bookingNo>`.

- [ ] **Step 1: Add `incomplete` to the state type + derivation**

In `bookings/page.tsx`, change `BookingState` (line 22) and `deriveState` (add before the `if (!today)` fallback, line ~31):
```tsx
type BookingState = "confirmed" | "checked-in" | "checked-out" | "cancelled" | "no-show" | "incomplete";
```
```tsx
  if (status === "no-show") return "no-show";
  if (status === "pending") return "incomplete";   // mobile-sync draft, not yet completed
  if (!today) return "confirmed";
```

- [ ] **Step 2: Add tone + label**

Add entries to `STATE_TONE` and `STATE_LABEL`:
```tsx
  "no-show": "warning",
  "incomplete": "warning",
```
```tsx
  "no-show": "No-show",
  "incomplete": "Incomplete",
```

- [ ] **Step 3: Exclude incomplete drafts from revenue KPI**

In the `kpis` object (line ~149), change `revenue` so provisional drafts don't count:
```tsx
    revenue: effective.filter(r => !cancelledIds.has(r.id) && deriveState(r, cancelledIds, today) !== "incomplete").reduce((t, r) => t + r.total, 0),
```
(`inHouse`/`confirmed` already filter by exact state, so incomplete is naturally excluded there.)

- [ ] **Step 4: Dash the provisional cells for incomplete rows**

In the table row, replace the date, nights, and amount cells (lines ~338-342) with state-aware rendering. `state` is already in scope per row:
```tsx
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular whitespace-nowrap">
                      {state === "incomplete" ? "—" : <>{formatDate(r.checkIn)} → {formatDate(r.checkOut)}</>}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{state === "incomplete" ? "—" : r.nights}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{state === "incomplete" ? "—" : money(r.total)}</td>
```

- [ ] **Step 5: Add the "Complete →" action for incomplete rows**

In the row action group (just inside `<div className="inline-flex gap-1 items-center">`, before the View button at line ~347), add a Complete link shown only for incomplete rows:
```tsx
                        {state === "incomplete" && (
                          <Link
                            href={`/bookings/new?resume=${r.bookingNo}`}
                            onClick={e => e.stopPropagation()}
                            className="h-8 px-2.5 rounded-md border border-warning/50 bg-warning-soft/40 text-warning text-xs font-medium inline-flex items-center gap-1 hover:bg-warning-soft transition-colors"
                            title="Finish this booking"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />Complete
                          </Link>
                        )}
```
Ensure `ArrowRight` is imported from `lucide-react` at the top of the file (add it to the existing import if missing).

- [ ] **Step 6: Hide check-in in the action menu for incomplete; keep folio/cancel**

The "Check guest in" menu item is already gated `state === "confirmed"`, so it won't show for incomplete — no change needed. Leave folio/cancel as-is.

- [ ] **Step 7: Verify (tsc + build)**

Run: `cd luxe-pms && npx tsc --noEmit -p tsconfig.json` → 0 errors.
Run: `npm run build` → compiles.

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/app/(app)/bookings/page.tsx"
git commit -m "feat(bookings): show pending drafts as Incomplete with Complete action"
```

---

## Task 3: NewGuestForm — accept `initialData` to pre-fill

**Files:**
- Modify: `luxe-pms/src/components/guests/new-guest-form.tsx`

**Interfaces:**
- Produces: `NewGuestForm` accepts an optional `initialData?: Partial<NewGuestData>` that seeds the form's internal state (merged over `EMPTY`). Existing callers (no prop) are unchanged.

- [ ] **Step 1: Add the prop to `Props`**

In `new-guest-form.tsx`, add to the `Props` interface:
```tsx
  /** When provided, seeds the form (used to resume an incomplete draft booking). */
  initialData?: Partial<NewGuestData>;
```

- [ ] **Step 2: Seed state from `initialData`**

Change the component signature and the `useState` initializer:
```tsx
export function NewGuestForm({ onCancel, onSave, mobileSync, initialData }: Props) {
  const [data, setData] = React.useState<NewGuestData>({ ...EMPTY, ...initialData });
```

- [ ] **Step 3: Verify (tsc)**

Run: `cd luxe-pms && npx tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "luxe-pms/src/components/guests/new-guest-form.tsx"
git commit -m "feat(guests): NewGuestForm initialData prop for resuming drafts"
```

---

## Task 4: Wizard — send `draftData` on sync, resume from `?resume=`, clear on Confirm

**Files:**
- Modify: `luxe-pms/src/app/(app)/bookings/new/page.tsx`

**Interfaces:**
- Consumes: `bookings.draftData` (Task 1), `NewGuestForm initialData` (Task 3), `?resume=<bookingNo>` from the list (Task 2).
- Produces: a resumable wizard — sync persists `draftData`; `?resume=` rehydrates guest form + dates/room/pax + captures and sets `syncBooking`; Confirm clears `draftData`.

- [ ] **Step 1: Send `draftData` on sync**

In `requestMobileSync` (the `apiPost("/bookings", {...})` payload, ~line 275-294), add a `draftData` field built from the guest's text fields (NOT the base64 captures):
```tsx
        balance: Math.round(total - advance),
        draftData: {
          name: g.name, phone: g.phone, email: g.email, address: g.address,
          nationality: g.nationality, dob: g.dob, gender: g.gender,
          idType: g.idType, idNumber: g.idNumber, company: g.company,
          gst: g.gst, vip: g.vip, remarks: g.remarks,
        },
        status: "pending",
```

- [ ] **Step 2: Read the resume param**

Near the other URL params (~line 158-161), add:
```tsx
  const resumeNo = searchParams.get("resume");
```

- [ ] **Step 3: Rehydrate on resume**

Add an effect after the existing URL-prefill effects. It loads the pending booking, fills booking fields + the guest form (via `setNewGuest`) + captures, and sets `syncBooking` so Confirm reuses the draft:
```tsx
  // Resume an incomplete (mobile-sync) draft: rehydrate the wizard from its
  // saved draftData + captured documents so the user can finish + Confirm.
  React.useEffect(() => {
    if (!resumeNo) return;
    let cancelled = false;
    (async () => {
      const rows = await apiGet<Array<{ id: number; bookingNo: string; status?: string; checkIn?: string; checkOut?: string; roomType?: string; ratePlan?: string; adults?: number; children?: number; guestName?: string }>>("/bookings").catch(() => []);
      const b = rows.find(r => r.bookingNo === resumeNo && r.status === "pending");
      if (cancelled || !b) return;   // already completed / not a draft → start fresh
      if (b.checkIn) setCheckIn(b.checkIn.slice(0, 10));
      if (b.checkOut) setCheckOut(b.checkOut.slice(0, 10));
      if (b.roomType) setRoomType(b.roomType);
      if (b.ratePlan) setRatePlan(b.ratePlan);
      if (typeof b.adults === "number") setAdults(b.adults);
      if (typeof b.children === "number") setChildren(b.children);
      setSyncBooking({ id: b.id, bookingNo: b.bookingNo });
      const full = await apiGet<{ draftData?: Record<string, unknown>; documents?: { guest_photo?: string | null; id_front?: string | null; id_back?: string | null; signature?: string | null } }>(`/bookings/${b.id}`).catch(() => null);
      if (cancelled) return;
      const dd = (full?.draftData ?? {}) as Partial<NewGuestData>;
      const docs = full?.documents ?? {};
      setNewGuest({
        name: dd.name ?? b.guestName ?? "", phone: dd.phone ?? "+91 ", email: dd.email ?? "",
        address: dd.address ?? "", nationality: dd.nationality ?? "India", dob: dd.dob ?? "",
        gender: dd.gender ?? "Male", idType: dd.idType ?? "Aadhaar", idNumber: dd.idNumber ?? "",
        idFront: docs.id_front ?? null, idBack: docs.id_back ?? null, photo: docs.guest_photo ?? null, signature: docs.signature ?? null,
        company: dd.company ?? "", gst: dd.gst ?? "", vip: dd.vip ?? false, remarks: dd.remarks ?? "",
      });
      setGuest(null);
    })();
    return () => { cancelled = true; };
  }, [resumeNo]);
```

- [ ] **Step 4: Clear `draftData` on Confirm**

In the `bookingPayload` (~line 1097-1115), add `draftData: null` so completing the booking clears the resume payload:
```tsx
                      status: "confirmed",     // reservation; room assigned at check-in
                      vip: false,
                      draftData: null,
```

- [ ] **Step 5: Verify (tsc + build)**

Run: `cd luxe-pms && npx tsc --noEmit -p tsconfig.json` → 0 errors.
Run: `npm run build` → compiles.

- [ ] **Step 6: Manual check (servers running)**

- New Booking → step 1, enter guest details → "Sync to mobile app" → a `pending` booking is created; the Bookings list shows it as **Incomplete** with `—` date/nights/price and a **Complete** action (not "Checked-in").
- Click **Complete** → wizard reopens with the guest details (and any captured proof) pre-filled; pick room/rate → Confirm → the **same** booking flips to a normal reservation (no duplicate); list no longer shows Incomplete.
- Visit `/bookings/new?resume=<a confirmed bookingNo>` → starts a normal booking, no crash.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/bookings/new/page.tsx"
git commit -m "feat(bookings): resume incomplete drafts in the New Booking wizard"
```

---

## Self-Review notes

- **Spec coverage:** column+cast+validation ✓ (T1); list incomplete state + dashed figures + Complete action + KPI exclusion ✓ (T2); form pre-fill ✓ (T3); sync persists draftData + resume rehydration (form + dates/room/pax + captures) + Confirm clears draftData ✓ (T4). Back-compatible (null draftData) ✓.
- **No duplicate booking:** resume sets `syncBooking`, so the existing Confirm path PUTs the same draft.
- **Captures not double-stored:** `draftData` holds only text fields; captures read from `/bookings/{id}` `documents` and write via `/verification` (unchanged).
- **Naming consistency:** `draftData` (column + cast + validation + payload + rehydration), `"incomplete"` state, `?resume=<bookingNo>`, `initialData` prop — identical across tasks.
- **Type consistency:** `setNewGuest` receives a complete `NewGuestData` (all 17 fields) in T4 Step 3, matching the interface used by Confirm.
