# Group Booking Custom Advance Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom rupee advance payment input to group booking, matching the booking flow's preset % + custom amount pattern.

**Architecture:** Add `customAdvance` state to track rupee mode, update the advance calculation to check customAdvance first (if not null, use it; else use paymentTerm %), and replace the preset-only button row with a toggle pattern: preset % buttons vs Custom button that shows an input field.

**Tech Stack:** React, TypeScript, Next.js, existing UI components (Button, Input, Label)

## Global Constraints

- TypeScript strict mode — no `any` types
- Use existing `money()` utility for rupee formatting
- UI must match booking flow's payment panel pattern exactly
- No backend changes needed — API already accepts `advance` as rupee amount
- All changes in `luxe-pms/src/app/(app)/groups/new/page.tsx`

---

### Task 1: Add customAdvance state and update advance calculation

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx:90-290`

**Interfaces:**
- Consumes: existing `paymentTerm` state (number | "custom"), `total` variable
- Produces: `customAdvance` state (number | null), updated `advance` variable

- [ ] **Step 1: Add customAdvance state after paymentTerm**

Find line 100: `const [paymentTerm, setPaymentTerm] = React.useState<number | "custom">(30);`

After that line, add:
```typescript
const [customAdvance, setCustomAdvance] = React.useState<number | null>(null);
```

- [ ] **Step 2: Update advance calculation to use customAdvance**

Find line 289: `const advance = paymentTerm === "custom" ? 0 : Math.round((total * paymentTerm) / 100);`

Replace with:
```typescript
const advance = customAdvance !== null
  ? Math.min(Math.max(0, Math.round(customAdvance)), total)
  : paymentTerm === "custom" ? 0 : Math.round((total * paymentTerm) / 100);
```

This prioritizes customAdvance: if it's set (not null), use it (capped 0 to total); otherwise fall back to percentage logic.

- [ ] **Step 3: Run type check to verify changes compile**

```bash
cd luxe-pms && npm run type-check
```

Expected: No errors in `src/app/(app)/groups/new/page.tsx`

---

### Task 2: Replace preset-only button row with preset + Custom toggle

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx:705-730`

**Interfaces:**
- Consumes: `customAdvance` state (from Task 1), `policies.depositPresets` array, `setPaymentTerm`, `setCustomAdvance` setters
- Produces: Updated button row that shows presets OR custom input based on state

- [ ] **Step 1: Find and replace the entire button section (lines 705-730)**

Current code:
```typescript
          <div className="border-t border-border pt-3">
            <Label>Advance payment</Label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {policies.depositPresets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaymentTerm(p)}
                  className={cn(
                    "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                    paymentTerm === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {p === 100 ? "Full" : `${p}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaymentTerm("custom")}
                className={cn(
                  "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                  paymentTerm === "custom" ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                Instalments
              </button>
            </div>
            {paymentTerm !== "custom" && (
              <div className="mt-3 space-y-1.5 text-sm">
                <Row k={`Advance (${paymentTerm}%)`} v={<span className="text-brand font-semibold">{money(advance)}</span>} />
                <Row k="Balance" v={money(total - advance)} muted />
              </div>
            )}
            {volumeDiscountPct > 0 && (
              <p className="text-xs text-success mt-1.5">Volume discount applied: {volumeDiscountPct}% off (block ≥ {policies.discountTiers.filter(t => totalRooms >= t.minRooms).sort((a,b) => b.minRooms - a.minRooms)[0]?.minRooms} rooms)</p>
            )}
          </div>
```

Replace with:
```typescript
          <div className="border-t border-border pt-3">
            <Label>Advance payment</Label>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {policies.depositPresets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPaymentTerm(p); setCustomAdvance(null); }}
                  className={cn(
                    "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                    customAdvance === null && paymentTerm === p ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}
                >
                  {p === 100 ? "Full" : `${p}%`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaymentTerm("custom")}
                className={cn(
                  "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                  paymentTerm === "custom" ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                Instalments
              </button>
              <button
                type="button"
                onClick={() => { setCustomAdvance(advance > 0 ? advance : 0); }}
                className={cn(
                  "h-9 px-3 rounded-md border text-xs font-medium transition-colors",
                  customAdvance !== null ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}
              >
                Custom
              </button>
            </div>
            {customAdvance !== null && (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={total}
                    value={customAdvance || ""}
                    onChange={e => setCustomAdvance(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="flex-1"
                  />
                  <div className="flex-1 text-right text-muted-foreground">
                    of {money(total)} · {total > 0 ? Math.round((advance / total) * 100) : 0}% advance
                  </div>
                </div>
              </div>
            )}
            {customAdvance === null && paymentTerm !== "custom" && (
              <div className="mt-3 space-y-1.5 text-sm">
                <Row k={`Advance (${paymentTerm}%)`} v={<span className="text-brand font-semibold">{money(advance)}</span>} />
                <Row k="Balance" v={money(total - advance)} muted />
              </div>
            )}
            {volumeDiscountPct > 0 && (
              <p className="text-xs text-success mt-1.5">Volume discount applied: {volumeDiscountPct}% off (block ≥ {policies.discountTiers.filter(t => totalRooms >= t.minRooms).sort((a,b) => b.minRooms - a.minRooms)[0]?.minRooms} rooms)</p>
            )}
          </div>
```

**Key changes:**
- Preset buttons now call `setCustomAdvance(null)` to exit custom mode
- Custom button calls `setCustomAdvance(advance > 0 ? advance : 0)` to enter custom mode
- Input field only shows when `customAdvance !== null`
- Input displays calculated % in real-time (`Math.round((advance / total) * 100)%`)
- Advance/Balance breakdown only shows when NOT in custom mode (where the input is visible)

- [ ] **Step 2: Verify no syntax errors by opening the file in your editor**

Open `luxe-pms/src/app/(app)/groups/new/page.tsx` and check that the section compiles (no red squiggles).

---

### Task 3: Update the API payload to pass the correct advance

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx:308-331`

**Interfaces:**
- Consumes: `advance` variable (updated by Task 1), `total` variable
- Produces: API call with correct `advance` rupee amount

- [ ] **Step 1: Verify the save function uses advance correctly**

Find the `save` function (line 308). Locate the line:
```typescript
advance: Math.round(advance),
```

This line already exists and is correct — it passes the advance amount (whether from preset % or custom rupee) directly to the API. **No change needed here** — Task 1's advance calculation handles both modes.

- [ ] **Step 2: Run type check again to confirm everything compiles**

```bash
cd luxe-pms && npm run type-check
```

Expected: No errors

---

### Task 4: Test the feature live in browser

**Files:**
- None (testing only)

**Interfaces:**
- Consumes: Running group booking form at `http://localhost:3000/groups/new`
- Produces: Visual verification of functionality

- [ ] **Step 1: Ensure dev servers are running**

```bash
# In PowerShell from repo root
.\start-dev.ps1
```

This starts both backend (port 8000) and frontend (port 3000).

- [ ] **Step 2: Open browser to group booking form**

Navigate to: `http://localhost:3000/groups/new`

- [ ] **Step 3: Fill in form to reach a total (all required fields)**

Fill in:
- Group name: "Test Group"
- Type: "Wedding"
- Contact name: "John Doe"
- Phone: "+91 98765 43210"
- Email: "john@example.com"
- Booked by: "Direct guest"
- Arrival: any future date
- Departure: 3 days later
- Block: 2 rooms × Deluxe @ suggested rate
- Pax: 6

The Live Summary should show a total (e.g., ₹30,000).

- [ ] **Step 4: Test preset % mode**

Click "30%" button in Advance payment section.
- Verify button is highlighted in brand color
- Verify "Advance (30%)" row appears showing ₹9,000
- Verify "Balance" row shows ₹21,000
- No input field should appear

- [ ] **Step 5: Test Custom button**

Click "Custom" button.
- Verify Custom button is highlighted in brand color
- Verify preset buttons are no longer highlighted
- Verify input field appears with "of ₹30,000 · 0% advance" text
- Advance (30%) and Balance rows should disappear

- [ ] **Step 6: Test custom rupee input**

In the custom input field, type: `12000`
- Verify advance calculates to ₹12,000
- Verify % display updates to "40% advance"
- Verify the input caps at total: try typing `50000`, should cap to ₹30,000

- [ ] **Step 7: Test switching back to preset**

Click "50%" button.
- Verify button is highlighted
- Verify custom input disappears
- Verify "Advance (50%)" row appears showing ₹15,000
- Verify state switched back to preset mode

- [ ] **Step 8: Verify form can save**

The "Create Group Booking" button should remain enabled throughout. Click it.
- Form should save and redirect to `/groups` list
- No errors in browser console

---

### Task 5: Run linter and commit

**Files:**
- Modify: `luxe-pms/src/app/(app)/groups/new/page.tsx`

**Interfaces:**
- None (final verification step)

- [ ] **Step 1: Run ESLint on the file**

```bash
cd luxe-pms && npm run lint -- src/app/\(app\)/groups/new/page.tsx
```

Expected: No errors or warnings introduced by your changes

- [ ] **Step 2: Run full type check one more time**

```bash
cd luxe-pms && npm run type-check
```

Expected: No errors

- [ ] **Step 3: Commit the changes**

```bash
git add luxe-pms/src/app/\(app\)/groups/new/page.tsx
git commit -m "feat(groups): add custom rupee advance payment option"
```

---

## Verification Checklist

Before marking complete:
- ✅ TypeScript compiles without errors
- ✅ ESLint passes
- ✅ Preset % buttons work (shows correct advance, balance, highlights correctly)
- ✅ Custom button toggles to input mode
- ✅ Custom input accepts rupee amounts and caps at total
- ✅ Custom input shows live % calculation
- ✅ Switching back to preset clears custom mode
- ✅ Form saves with advance amount from either mode
- ✅ Changes committed with clear message
