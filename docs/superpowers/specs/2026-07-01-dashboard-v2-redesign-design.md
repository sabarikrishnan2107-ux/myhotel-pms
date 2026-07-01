# DashboardV2 — full light-mode premium dashboard redesign

**Date:** 2026-07-01
**Status:** Approved (design)

## Problem

The current `/dashboard` (dark navy "luxury hospitality" theme) is functional but the
user wants a completely different visual direction explored: a light-mode, purple/navy
SaaS-enterprise look, without touching the existing dashboard or its theme. This must
be additive and fully reversible — a parallel page, not a replacement.

## Decision

Build `/dashboard-v2` as a brand-new, self-contained Next.js route with its own layout,
sidebar, and header — outside the `(app)` route group so it does **not** inherit the
existing `AppShell` (which would otherwise nest two sidebars). Visual target is the
user-provided reference mockup (light `#F7F8FC` background, `#101A33` navy/purple
sidebar, `#6D4AFF` purple primary, `#F5B800` gold accent for luxury branding, soft
shadows, rounded cards, no heavy borders).

All colors are literal Tailwind arbitrary values (`bg-[#F7F8FC]`, `text-[#111827]`,
etc.) local to the new components — the app-wide dark-navy CSS theme in `globals.css`
is not modified, so the existing dashboard and every other page render exactly as
before.

Data is mocked but typed to match the real API shapes the current dashboard already
consumes (`/stats`, `/room-board`, `/audit-logs` — see `dashboard/page.tsx`), so wiring
to the live backend later is a drop-in replacement of the mock import with `apiGet`
calls, not a rewrite of any component.

## Requirements

### Routing & isolation
- New folder: `luxe-pms/src/app/dashboard-v2/` (top-level, sibling to `(app)/`).
- `luxe-pms/src/app/dashboard-v2/layout.tsx` — minimal passthrough (`{children}`), no
  `AppShell`. `luxe-pms/src/app/dashboard-v2/page.tsx` is the page itself.
- No link is added anywhere in the existing app to `/dashboard-v2` — reachable only by
  typing the URL. The old `/dashboard` page, `AppShell`, `Sidebar`, and `globals.css`
  are not modified in any way.

### Color palette (literal values, not new CSS variables)
| Token | Hex | Usage |
|---|---|---|
| Background | `#F7F8FC` | page background |
| Card background | `#FFFFFF` | all cards |
| Sidebar background | `#101A33` | sidebar |
| Sidebar active / primary purple | `#6D4AFF` | active nav item, primary buttons, primary KPI accents |
| Gold | `#F5B800` | luxury branding accents only (logo crest, AI briefing CTA, occupancy ring) — not a general-purpose action color |
| Green | `#22C55E` | available/positive status |
| Blue | `#3B82F6` | informational status |
| Pink/Red | `#F43F5E` | danger/out-of-order/outstanding-balance status |
| Text dark | `#111827` | primary text |
| Muted text | `#6B7280` | secondary text |
| Light border | `#E5E7EB` | hairline separators only where a shadow isn't enough |

### Sidebar (`components/dashboard-v2/sidebar.tsx`)
- Fixed-left, `#101A33` background, logo crest (gold `PP` monogram placeholder) +
  "The Pearl Palace / Luxury Hotel & Resort" wordmark.
- Two groups, unlabeled sections separated by spacing (Operations vs Management), per
  the reference image: Dashboard, Front Desk, Reservations, Guests, Housekeeping,
  Maintenance, Finance, Reports / Rooms & Rates, Channel Manager, Staff, Settings.
- Route mapping (existing routes reused as-is, confirmed with user):
  `Dashboard→/dashboard-v2, Front Desk→/rack, Reservations→/bookings, Guests→/guests,
  Housekeeping→/housekeeping, Maintenance→/maintenance, Finance→/accounts,
  Reports→/reports, Rooms & Rates→/setup, Channel Manager→/channels, Staff→/staff,
  Settings→/setup`.
- Active item: solid `#6D4AFF` background pill, white text/icon. Inactive: light
  grey-on-navy text, hover = subtle lighter navy background. No collapse/expand
  behavior needed (unlike the existing hover-rail sidebar) — fixed width `~256px`.
- Icons from `lucide-react`, matching the reference image's icon choices per item
  (Home/LayoutDashboard, DoorOpen/UserCheck for Front Desk, CalendarRange for
  Reservations, Users, Sparkles, Wrench, Wallet, FileBarChart, SlidersHorizontal,
  Globe, UserCog, Settings).
- Footer: "Quick Support / We are online 24/7" static card (no live chat wiring).

### Top header (`components/dashboard-v2/top-header.tsx`)
- Sticky, white background, soft bottom shadow (no hard border).
- Search input (icon + placeholder "Search by guest, booking, room..." + `⌘K` hint,
  non-functional stub for now — no live search wiring).
- Live clock + date (`HH:MM AM/PM`, `Jul 01, 2026 · Tuesday`), client-only
  (`useEffect`-driven `setInterval`, same avoid-hydration-mismatch pattern as
  `dashboard/page.tsx`'s `nowMs`).
- "+ New Booking" button, solid purple, links to `/bookings/new`.
- Notification bell with a small red count badge (static mock count).
- User avatar + name/role text ("Khalid R. / Reception · Shift #4218" — static mock,
  no auth wiring yet) + chevron.

### Occupancy hero + KPI row (first row)
- `components/dashboard-v2/occupancy-hero.tsx`: large card (~2 cols wide), dark navy
  gradient background (distinct from the light page bg, matches reference image),
  big `72%` figure, radial/donut progress ring (reuse the same SVG arc technique as
  the existing `OccupancyGauge`, restyled: gold ring on navy), "8 of 12 rooms
  occupied", a small up/down trend line ("↑ 12% vs yesterday"), "View detailed
  report" ghost button.
- `components/dashboard-v2/kpi-card.tsx`: 5 tiles (Available Rooms, Occupied Rooms,
  Arrivals, Departures, Out of Order) — white cards, colored icon chip (blue/green/
  gold/purple/pink per the reference image), big number, small colored sub-badge
  where applicable (e.g. `75%`, `8%`), muted caption line.

### Quick actions (second row)
- `components/dashboard-v2/quick-action-tile.tsx`: 8 tiles in one row (New Booking,
  Check-in, Checkout, Room Rack, Calendar, Housekeeping, Cashier, Reports) — white
  card, large soft-colored rounded-square icon (each tile's own tone, matching the
  reference image's per-tile colors), label below, subtle hover lift. Housekeeping
  tile keeps a small count badge (mock `2`) matching the current dashboard's
  `quickCounts.housekeeping` badge behavior.

### Third row — Priorities / Live Room Status / AI Briefing
- `components/dashboard-v2/priorities-list.tsx`: "Today's Priorities" card, header
  with item-count pill, actionable rows (colored icon chip + title + hint + count
  badge + chevron) — same data shape as today's dashboard priorities (`Outstanding
  balance`, `Checkouts due today`, `Rooms to clean`, `Rooms out of order`).
- `components/dashboard-v2/room-status-grid.tsx`: "Live Room Status" card — floor-row
  grid of room-number pills (not the current stacked-bar heatmap): each room number
  in a small rounded chip colored by status (Available green / Occupied gold /
  Reserved blue / Out of Order pink / Blocked grey), floor label on the left, a
  legend row at the bottom, "All Floors" filter dropdown stub (visual only for now).
- `components/dashboard-v2/ai-briefing-card.tsx`: dark navy gradient card (matches
  reference image, distinct from the light page bg like the occupancy hero), bot/
  sparkle icon avatar, 4 bullet lines (occupancy / outstanding / housekeeping / top
  source — same content as today's AI briefing), gold "View full analysis" button
  linking to `/ai`.

### Fourth row — Arrivals / Departures / Recent Activity
- `components/dashboard-v2/arrivals-card.tsx` and `departures-card.tsx`: header with
  "View all" link, summary line (room/hall counts), list rows reusing the same
  guest-avatar + name + room + status pattern as the current dashboard's Arrivals/
  Departures cards, restyled to the light palette.
- `components/dashboard-v2/activity-feed.tsx`: "Recent Activity" card, two-column
  compact grid of recent events (icon chip + verb + actor + time), matching the
  reference image's dense 2-column layout.

### Data layer
- `luxe-pms/src/components/dashboard-v2/types.ts`: `DashboardV2Data` interface —
  mirrors the real shapes already used by `dashboard/page.tsx` (`DashStats`,
  `RoomBoardRow`, `AuditRow` room/priority/activity fields), so a future swap from
  mock to `apiGet` requires no prop-shape changes downstream.
- `luxe-pms/src/components/dashboard-v2/mock-data.ts`: one exported `MOCK_DASHBOARD_V2_DATA:
  DashboardV2Data` object with realistic values matching the reference image (72%
  occupancy, 12 rooms across floors F1–F6, etc.) so the page renders meaningfully
  without a backend.
- `page.tsx` imports the mock object directly (no `useState`/`useEffect`/`apiGet` — no
  network calls yet, per "use dummy data first").

### Responsiveness
- Primary targets: desktop (`lg`/`xl`) and large display/TV (`2xl`+, centered
  max-width content ~1600px so it doesn't stretch awkwardly on very wide screens).
- Tablet (`md`): KPI row wraps to 2–3 per row, quick actions wrap to 4 per row, third/
  fourth row cards stack to 1–2 columns.
- Mobile is not a primary target for this redesign (per the request's explicit
  "desktop, tablet, and TV" scope) — basic single-column reflow only, no dedicated
  mobile sidebar drawer work.

## Out of scope

- Any change to `/dashboard`, `AppShell`, `Sidebar`, `TopBar`, or `globals.css`.
- Real backend wiring (`apiGet` calls) — mock data only, structured for an easy swap
  later.
- Functional search, notifications, or auth-driven user info — all static/mock.
- Adding `/dashboard-v2` to the existing sidebar or making it the default route.
- New reusable design-token system (CSS variables) for the new palette — literal
  Tailwind arbitrary values are enough for a single-page prototype; revisit if/when
  this becomes the permanent dashboard.

## Verification

Visit `/dashboard-v2` directly: renders the full page with its own purple/navy
sidebar and light content area (no double sidebar, no dark-theme bleed). All 11 nav
items are clickable and route to real existing pages. Occupancy hero, 5 KPI tiles, 8
quick-action tiles, priorities list, room status grid, AI briefing, arrivals,
departures, and activity feed all render with the mock data. Resize to tablet width —
grids reflow without overlap. Visit `/dashboard` — unchanged, still dark navy theme,
unaffected by any of the above.
