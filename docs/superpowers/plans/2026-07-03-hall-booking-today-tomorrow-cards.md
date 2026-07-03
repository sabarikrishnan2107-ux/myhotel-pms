# Hall Booking Today's/Tomorrow's Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Today's Bookings" and "Tomorrow's Bookings" count cards to the Hall Booking KPI bar at `/halls`.

**Architecture:** Pure client-side derivation from the already-loaded `bookings` state in `HallsPage` — no new API calls, no new component. Two plain `const` counts computed the same way `totalRev`/`outstanding` already are, rendered via two more `KPICard` instances, with the KPI grid widened from 4 to 6 columns.

**Tech Stack:** Next.js (App Router) + React + TypeScript, Tailwind, lucide-react icons. This project has no test runner configured (no jest/vitest, no `*.test.ts(x)` files outside `node_modules`) — verification is manual, via the dev server in a browser, per project convention.

## Global Constraints

- Dates are compared as `YYYY-MM-DD` strings, matching the existing `HallBooking.date`/`endDate` format (see `luxe-pms/src/app/(app)/halls/_components/hall-dialogs.tsx` `HallBooking` type).
- Cancelled bookings are excluded from both counts; completed bookings are included (per approved spec).
- A booking counts for a given day `d` if `b.date <= d <= (b.endDate ?? b.date)`.
- No backend/API changes.

---

### Task 1: Add Today's/Tomorrow's Bookings KPI cards

**Files:**
- Modify: `luxe-pms/src/app/(app)/halls/page.tsx:5-10` (icon imports)
- Modify: `luxe-pms/src/app/(app)/halls/page.tsx:74-76` (add count consts)
- Modify: `luxe-pms/src/app/(app)/halls/page.tsx:166-171` (KPI grid JSX)

**Interfaces:**
- Consumes: existing `effective` (computed `HallBooking[]`, includes `status`, `date`, `endDate` fields) and `KPICard` component (`label`, `value`, `icon`, `accent` props) — both already in scope in this file.
- Produces: nothing consumed by other files — this is a leaf page component.

- [ ] **Step 1: Add the two new lucide-react icon imports**

In `luxe-pms/src/app/(app)/halls/page.tsx`, the current import block (lines 5-10) reads:

```tsx
import {
  Plus, Search, Calendar, Users, Building2,
  Eye, Edit, Ban, MoreHorizontal, CheckCircle2,
  Mail, MessageCircle, IndianRupee, Printer, FileText,
  Wallet, LayoutGrid, List,
} from "lucide-react";
```

Change it to:

```tsx
import {
  Plus, Search, Calendar, Users, Building2,
  Eye, Edit, Ban, MoreHorizontal, CheckCircle2,
  Mail, MessageCircle, IndianRupee, Printer, FileText,
  Wallet, LayoutGrid, List, CalendarCheck, CalendarClock,
} from "lucide-react";
```

- [ ] **Step 2: Add today/tomorrow count consts**

Find this block (around line 74-76):

```tsx
  const totalRev = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.total, 0);
  const advance = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.advance, 0);
  const outstanding = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total - b.advance), 0);
```

Add the following directly above it (so the new consts are defined before use, same scope as `totalRev`):

```tsx
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString("en-CA");
  const isOnDate = (b: HallBooking, d: string) => b.date <= d && (b.endDate ?? b.date) >= d;
  const todayCount = effective.filter(b => b.status !== "cancelled" && isOnDate(b, today)).length;
  const tomorrowCount = effective.filter(b => b.status !== "cancelled" && isOnDate(b, tomorrow)).length;

  const totalRev = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.total, 0);
  const advance = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + b.advance, 0);
  const outstanding = effective.filter(b => b.status !== "cancelled").reduce((s, b) => s + (b.total - b.advance), 0);
```

- [ ] **Step 3: Widen the KPI grid to 6 columns and insert the two new cards**

Find this block (around line 165-171):

```tsx
      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Halls" value={halls.length} icon={Building2} accent="brand" />
        <KPICard label="Active Bookings" value={effective.filter(b => b.status !== "cancelled").length} icon={Calendar} accent="info" />
        <KPICard label="Hall Revenue" value={money(totalRev)} icon={IndianRupee} accent="success" />
        <KPICard label="Outstanding" value={money(outstanding)} icon={Wallet} accent="warning" hint={`of ${money(totalRev)}`} />
      </div>
```

Replace it with:

```tsx
      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Halls" value={halls.length} icon={Building2} accent="brand" />
        <KPICard label="Active Bookings" value={effective.filter(b => b.status !== "cancelled").length} icon={Calendar} accent="info" />
        <KPICard label="Today's Bookings" value={todayCount} icon={CalendarCheck} accent="accent" />
        <KPICard label="Tomorrow's Bookings" value={tomorrowCount} icon={CalendarClock} accent="neutral" />
        <KPICard label="Hall Revenue" value={money(totalRev)} icon={IndianRupee} accent="success" />
        <KPICard label="Outstanding" value={money(outstanding)} icon={Wallet} accent="warning" hint={`of ${money(totalRev)}`} />
      </div>
```

- [ ] **Step 4: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors referencing `page.tsx`.

- [ ] **Step 5: Manually verify in the browser**

1. Start the dev servers from the repo root: `./start-dev.ps1` (starts backend on the pgsql-enabled PHP and the Next.js frontend).
2. Open `/halls` in the browser, log in as `admin@hotel.com` / `password123` if prompted.
3. Confirm the KPI bar now shows 6 cards: Halls, Active Bookings, Today's Bookings, Tomorrow's Bookings, Hall Revenue, Outstanding.
4. Confirm "Today's Bookings" and "Tomorrow's Bookings" show plausible counts — cross-check against the booking list's `Date & Time` column for rows matching today's/tomorrow's actual calendar date.
5. Confirm a cancelled booking (if any exist matching today/tomorrow) is NOT counted.
6. Resize the browser window (or use devtools responsive mode) to confirm the grid reflows: 2 cols on mobile width, 3 cols on tablet width (~768px), 6 cols on desktop width (~1024px+).

- [ ] **Step 6: Commit**

```bash
git add luxe-pms/src/app/\(app\)/halls/page.tsx
git commit -m "feat(luxe-pms): add today's/tomorrow's bookings KPI cards to Hall Booking dashboard"
```
