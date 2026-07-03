# Hall Booking: Today's & Tomorrow's Bookings Cards

## Problem

The Hall Booking dashboard (`/halls`) KPI bar shows Halls, Active Bookings, Hall Revenue, and Outstanding — but no at-a-glance view of what's happening today or tomorrow. Staff need to see today's/tomorrow's booking counts without scanning the full table.

## Design

**Layout**

The KPI grid (`luxe-pms/src/app/(app)/halls/page.tsx`, currently `grid-cols-2 md:grid-cols-4`) becomes `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`, growing from 4 to 6 cards. New order:

1. Halls
2. Active Bookings
3. **Today's Bookings** (new)
4. **Tomorrow's Bookings** (new)
5. Hall Revenue
6. Outstanding

**New cards**

Both use the existing `KPICard` component (`luxe-pms/src/components/ui/kpi-card.tsx`) — no new component needed.

- **Today's Bookings**: count, icon `CalendarCheck`, accent `accent`.
- **Tomorrow's Bookings**: count, icon `CalendarClock`, accent `neutral`.

**Counting logic**

A booking counts toward "today" if today's date falls within `[b.date, b.endDate ?? b.date]` (inclusive), covering multi-day hall bookings. Same logic for "tomorrow" using tomorrow's date. Cancelled bookings are excluded; completed bookings are included (the card reflects "events happening on this date", not booking-workflow status).

Dates are compared as `YYYY-MM-DD` strings (matching the existing `b.date`/`b.endDate` format used elsewhere in the file, e.g. `apiGet<HallBooking[]>("/hall-bookings")`). "Today"/"tomorrow" are computed once via `new Date().toLocaleDateString("en-CA")` (already used elsewhere in this file for `handlePayment`) and `+1 day` respectively, memoized alongside the existing `effective` computation.

## Out of scope

- No new backend endpoint or query — counts are derived client-side from the already-loaded `bookings` list, same as the other 4 KPI cards.
- No drill-down/filter-on-click behavior for the new cards (existing KPI cards don't have this either).
- No revenue/occupancy breakdown on the new cards — count only, per user request.
