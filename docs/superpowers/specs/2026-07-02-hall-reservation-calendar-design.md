# Hall Reservation Calendar

**Date:** 2026-07-02

## Decision

Add a Gantt-style Hall Reservation Calendar at a new route
`luxe-pms/src/app/(app)/halls/calendar/page.tsx`, visually consistent with the
existing Room Reservation Calendar (`calendar/page.tsx`): venues as rows, days
as columns, booking blocks positioned across the visible window. Extract the
detail/modify/cancel/payment UI currently private to `halls/page.tsx` into a
shared component file so both the list and calendar pages use identical
dialogs. Add a sidebar entry and a button from the Hall Booking list page.

## Data

Both existing endpoints, no backend changes:
- `GET /hall-packages` → venues (rows). Same `Venue`/`Hall` shape already used
  in `halls/page.tsx` and `halls/new/page.tsx` (`id, name, capacity, hourly,
  halfDay, fullDay, setupFee, gst, extraPaxFee`).
- `GET /hall-bookings` → bookings (blocks). Same `HallBooking` shape,
  including the in-flight `eventName` / `endDate` fields
  (`ResourceController.php` resource def, migrations
  `2026_07_02_000000_add_end_date_to_hall_bookings` and
  `..._000100_add_event_name_to_hall_bookings`).

## Block positioning

Unlike the room calendar's noon-anchored hotel-night math (rooms), hall
bookings span whole calendar days: a block starts at `date` and runs through
`endDate` inclusive (`endDate` defaults to `date` when absent/equal). Reuse
the room calendar's day-column grid (`CELL_W`/`ROW_H`/`LABEL_W`,
`VIEW_SPANS` Day/Week/2 Weeks/Month) and its greedy lane-stacking algorithm
(`assignLanes` in `calendar/page.tsx:59-72`) adapted to whole-day spans, so
overlapping bookings in the same hall render in separate stacked lanes
instead of on top of each other.

Each block's label shows event name / customer, and (when wide enough) the
`start`–`end` time range, since day-level columns alone don't convey a hall's
hourly booking.

## Color coding

By booking status, matching the badges already used on `/halls`
(`STATUS_TONE` in `halls/page.tsx:31-37`): pending = amber, confirmed =
green, in-progress = blue, completed = gray. Cancelled bookings are excluded
from the grid by default; a "Show cancelled" toggle in the filter bar reveals
them at reduced opacity (`opacity-60`, same treatment as cancelled rows in
the list view).

## Toolbar

Mirrors `calendar/page.tsx`'s toolbar for consistency:
- Prev/Next window navigation, "Today" button, date jumper.
- Hall filter (all / one venue).
- View span selector (Day / Week / 2 Weeks / Month).
- Status filter (all / pending / confirmed / in-progress / completed) +
  "Show cancelled" toggle.
- KPI strip, hall-relevant analogs of the room calendar's KPIs: events in
  window, guests in window, revenue in window, outstanding balance in
  window, hall-utilization % (booked hall-days ÷ halls × days-in-view).

## Interaction — shared detail drawer

`HallDetailDrawer`, `ModifyHallDialog`, `ReceivePaymentDialog`,
`CancelHallDialog`, plus the types/constants they depend on (`Hall`,
`HallBooking`, `HallOverride`, `VenueRates`, `STATUS_TONE`, `TIME_SLOTS`),
move from private functions in `halls/page.tsx` into
`luxe-pms/src/app/(app)/halls/_components/hall-dialogs.tsx` and are exported.

`halls/page.tsx` imports from that new file instead of defining them inline —
a pure extraction, no behavior change to the existing list page.

`halls/calendar/page.tsx` imports the same components. Double-clicking a
block opens `HallDetailDrawer`; Modify/Cancel/Receive-payment/Mark-completed
all work from the calendar exactly as they do from the list, each page
independently fetching `/hall-bookings` and owning its own mutation handlers
(`apiPut`/`apiPost`) — the same independent-fetch pattern `calendar/page.tsx`
and `bookings/page.tsx` already use for `/bookings`.

## Sidebar + entry points

Add to `luxe-pms/src/lib/nav.ts`, immediately after the existing `/halls`
entry:

```ts
{ href: "/halls/calendar", label: "Hall Calendar", icon: CalendarRange, group: "operations", module: "banquets" },
```

Same group and `module: "banquets"` gate as `/halls`, so visibility follows
the existing licensing rule (only shown for tenants with the banquets
module). Reuses the `CalendarRange` icon already imported in `nav.ts` (used
by `/calendar` and `/fb/beo`).

Add a "Reservation Calendar" outline button on `halls/page.tsx` next to "New
Hall Booking", mirroring the "Open Room Rack" button pattern on
`calendar/page.tsx:262`.

## Out of scope

No backend/API changes. No drag-to-move or drag-to-resize of blocks
(display + double-click only, same as the room calendar). No changes to the
Modify/Cancel/Payment business logic itself — only where the components
live. No persistence of calendar filter state across sessions.

## Verification

`tsc --noEmit` clean. Manually: navigate to `/halls/calendar` from the
sidebar and from the `/halls` page button; confirm blocks render for seeded
hall bookings at the correct day span; confirm overlapping bookings in the
same hall stack into separate lanes; toggle hall/status/"show cancelled"
filters and view span; double-click a block and confirm Modify, Cancel,
Receive payment, and Mark completed all work and persist (matching what
`/halls` shows); confirm `/halls` list page still renders and behaves
identically after the dialog extraction.
