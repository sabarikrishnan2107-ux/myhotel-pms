# Dashboard — visual polish for Priorities / Live Status / Activity / AI Briefing row

**Date:** 2026-07-01
**Status:** Approved (design) — mockup reviewed in `sample.html`, user approved "apply as-is"

## Problem

The four-card row on `dashboard/page.tsx` (Priorities, Live Status, Activity, AI
Daily Briefing) works but feels visually flat/cramped: inconsistent card headers,
plain icon chips, grey legend dots, a flat activity list, and a low-contrast AI
card. Pure visual polish — no data, layout structure, or information changes.

## Decision

Apply the "After — Refined" styling validated in `sample.html` to the same four
cards, keeping every prop/data source unchanged. Only className/markup changes.

## Requirements

**Shared**
- Card headers get a consistent pattern: small bold uppercase eyebrow (brand
  color) with a leading Lucide icon, then a larger `text-xl font-semibold
  tracking-tight` title underneath. Apply to all 4 cards (Activity currently has
  no eyebrow — add one: "ACTIVITY" / `history` icon).

**Priorities (`PriorityRow` in `dashboard/page.tsx`)**
- Row becomes `rounded-xl`, `p-3.5`, with a 1px-wide colored accent bar on the
  left edge (matches the row's `tone` color) via an absolutely-positioned span.
- Icon chip grows from `h-9 w-9` to `h-10 w-10`, `rounded-lg`.
- Count badge on multi-count rows becomes bold/full-circle-ish pill (unchanged
  tone mapping).
- Chevron gets `group-hover:translate-x-0.5` micro-interaction (already has
  hover color change).
- Item count badge in the card header (top-right "N items") becomes a solid
  filled circle (`bg-brand`) instead of the soft badge.

**Live Status (`OccupancyGauge` usage + gauge component)**
- Gauge arc gets a two-stop gradient stroke (danger → warning hues) instead of a
  flat single color; bump size slightly (~170 → ~188 viewBox) and bold the
  percentage number.
- "Live" pill gets a soft success background instead of bare text+dot.
- Floor map segments (already stacked bars per the 2026-06-27 spec) get
  `rounded-full` ends and a small gap between segments instead of square-cornered
  adjoining segments.
- Legend row: replace plain `LegendDot` (colored square + muted text) with
  filled rounded chips — soft background tinted to that status's color, colored
  text, small dot. Same 5 entries, same data.

**Activity**
- Replace the plain divided list with a connected vertical timeline: a 1px line
  behind the icon column, icon chips become `rounded-full` avatars, hover state
  highlights the row background+radius (no divider lines).
- Add a "View all activity" text affordance at the bottom of the card. No
  dedicated activity-log route exists today, so it is a plain non-navigating
  button (no `href`) — visual only, matching the mockup.

**AI Daily Briefing**
- Card background becomes a soft accent-tinted gradient plus a blurred glow
  blob in one corner (decorative `div`, `pointer-events-none`).
- Bot icon avatar bumps to `h-10 w-10 rounded-xl` with a shadow.
- Each briefing bullet gets a small `h-6 w-6` icon chip (icon chosen per bullet
  type: occupancy → `percent`, outstanding balance → `wallet`, housekeeping →
  `brush-cleaning`, source mix → `trending-up`, fallback → keep the existing
  colored dot) instead of a bare colored dot.
- "Ask AI" footer link becomes a small filled pill button (`bg-brand`, rounded
  full) instead of a text link; keeps the same `/ai` href.

## Out of scope

- Any change to the KPI row, Quick Actions grid, Arrivals/Departures cards, or
  any data-fetching logic.
- Floor map segment ordering/colors (already correct per prior spec).
- New routes for "View all activity" — reuse the closest existing page or make
  it a no-op link if nothing fits; do not build a new activity-log screen.

## Verification

Open `/dashboard`: all four cards show the refined header pattern; priority rows
show a left accent bar; the occupancy gauge shows a gradient arc; floor map
legend renders as colored chips; activity shows a connected timeline; the AI
card shows the glow background, per-bullet icons, and a pill "Ask AI" button.
No console errors; existing data (counts, percentages, activity text) unchanged.
