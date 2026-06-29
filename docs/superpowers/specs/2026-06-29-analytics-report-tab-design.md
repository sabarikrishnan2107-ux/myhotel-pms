# Analytics Report tab — move dashboard analytics into a dedicated page

**Date:** 2026-06-29
**Status:** Approved design, ready for implementation plan

## Problem

The dashboard ([luxe-pms/src/app/(app)/dashboard/page.tsx](../../../luxe-pms/src/app/(app)/dashboard/page.tsx))
mixes day-to-day reception operations with manager-level analytics in one long
scroll. The analytics blocks (revenue, goals, forecast, source mix, trend,
alerts) belong on their own page so the dashboard stays focused on "what's
happening right now" and the analytics get a dedicated home in the sidebar.

## Goal

Move the analytics blocks off the dashboard into a new manager-only sidebar tab
called **Analytics Report**, and remove them from the dashboard (a true move,
not a duplicate).

## Scope

### Blocks that move to the new tab (dashboard sections 5–8)

1. **Revenue** breakdown strip — Room / F&B / Hall / Advance / Outstanding / Total.
2. **Monthly Goals + Top Sources** — goal-progress grid and "Best Performers" leaderboard.
3. **Occupancy Forecast + Source Mix** — area chart and donut.
4. **Revenue Trend + Alerts** — stacked bar chart and alerts list.

### Blocks that stay on the dashboard (sections 1–4)

- Executive KPIs (Total Rooms, Occupied, Available, Arrivals, Departures, Out of Order)
- Quick Actions
- Today's Arrivals + Departures
- Today's Priorities + Live Status + Activity + AI Daily Briefing

### Access note (intentional)

The new tab is **manager-only** (`roles: MANAGER`), consistent with the existing
`/reports` tab. Because the analytics also leave the dashboard, staff/reception
users will no longer see revenue, goals, forecast, or alerts anywhere. This is
intended — these are manager-level analytics.

## Approach

Extract the analytics UI and its data-fetching into one self-contained client
component, render it on a new thin page, and strip the moved sections (plus their
now-orphaned state and helpers) from the dashboard.

### New route & nav

- New page: `luxe-pms/src/app/(app)/analytics/page.tsx` — renders `<AnalyticsReport />`.
- Add to [luxe-pms/src/lib/nav.ts](../../../luxe-pms/src/lib/nav.ts):
  `{ href: "/analytics", label: "Analytics Report", icon: TrendingUp, group: "system", roles: MANAGER }`,
  placed immediately before the `/reports` entry. `TrendingUp` is already imported in `nav.ts`.

### New component `luxe-pms/src/components/dashboard/analytics-report.tsx`

A `"use client"` component that owns everything the analytics need:

- **Data fetching** (same endpoints the dashboard uses today):
  - `apiGet<DashStats>("/stats")` — for `revenue` and `sourceMix`
  - `apiGet<GoalRow[]>("/dashboard/goals")`
  - `apiGet<ForecastRow[]>("/dashboard/occupancy-forecast")`
  - `apiGet<TrendRow[]>("/dashboard/revenue-trend")`
  - `apiGet<AlertRow[]>("/dashboard/alerts")`
- **Property/currency**: `useProperty()` + `currencySymbol()`.
- **Period**: the `new Date()`-derived `{ label, day, days }` used by the Monthly Goals header.
- **Offline banner**: the same "Backend offline — showing sample data" banner, shown when `/stats` fails.
- **Render order** (identical markup/styling to today): Revenue strip → Monthly Goals + Top Sources → Occupancy Forecast + Source Mix → Revenue Trend + Alerts.
- **Moves with it**: `SOURCE_COLORS`, `TOP_SOURCES`, `GOALS_FALLBACK`, the recharts imports
  (`ResponsiveContainer`, `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`,
  `BarChart`, `Bar`, `PieChart`, `Pie`, `Cell`, `Legend`), the `KPISpark` helper (and its
  `Sparkline` import), and the `TrendRow` / `ForecastRow` / `AlertRow` / `GoalRow` types.
  `GoalProgress` stays a shared `@/components/ui` import.

### Shared helper extraction

`SectionHeader` is used by both a block that stays (Quick Actions) and a block that
moves (Revenue). Extract it to `luxe-pms/src/components/dashboard/section-header.tsx`
and import it in both the dashboard page and the new component. Avoids duplication.

### Dashboard cleanup ([luxe-pms/src/app/(app)/dashboard/page.tsx](../../../luxe-pms/src/app/(app)/dashboard/page.tsx))

Remove:

- JSX sections 5–8 (Revenue, Monthly Goals + Top Sources, Charts, Revenue Trend + Alerts).
- State that only those sections used: `trend`, `forecast`, `liveAlerts`, `goals`
  (and their `useEffect` fetches).
- Derived values only those sections used: `rev`, `topSources`, `sourceMixDonut`, `period`.
- Constants/helpers only those sections used: `SOURCE_COLORS`, `TOP_SOURCES`,
  `GOALS_FALLBACK`, `KPISpark`, the `Sparkline` import, the recharts imports, and the
  `TrendRow` / `ForecastRow` / `AlertRow` / `GoalRow` types.
- The now-unused `SectionHeader` local definition (replaced by the shared import).
- Any other symbols left unreferenced after the cut (e.g. the unused `StatRow` helper, if present).

Keep: KPIs, Quick Actions, Arrivals/Departures, Priorities/Live Status/Activity/AI,
the booking detail drawer, and all their state (`stats`, `board`, `audit`, `roomCounts`,
`arrivals`, `departures`, `priorities`, `activity`, `aiBriefing`, `selectedRes`, etc.).

`/stats` is fetched independently by both pages — this is how the app already works
when navigating between pages; no shared cache is introduced.

## Data flow

No backend changes. Both pages call the same existing read endpoints. The analytics
page is read-only.

## Error handling

Mirror the dashboard's current behaviour: each `apiGet` `.catch()` is swallowed and
the UI falls back to empty/sample data; a failed `/stats` raises the offline banner.

## Testing

- Manual: run the app, sign in as manager, open **Analytics Report** — all four blocks
  render with the same data/look they had on the dashboard; the offline banner appears
  when the API is down. Confirm the dashboard no longer shows those four blocks and its
  remaining sections are intact. Confirm the tab is hidden for non-manager roles.
- Build/lint: `npm run build` / lint passes (no unused-import or dead-code errors after the cut).
- No new unit tests required (pure presentational move). Optional: a render test for the
  extracted `SectionHeader` if we want a regression guard.

## Out of scope

- Any change to the analytics calculations, endpoints, or styling.
- Re-theming, new charts, date-range filters, or export.
- Changing dashboard layout beyond removing the moved sections.
