# Dashboard Floor Map → per-floor stacked status bars

**Date:** 2026-06-27
**Status:** Approved (design)

## Problem

The dashboard Floor Map (`FloorHeatmap`) renders each floor as a row of one small
square dot per room, colored by status. Staff want a cleaner **bar** visualization.

## Decision

Each floor becomes one horizontal **stacked bar**, split into colored segments sized
by how many rooms are in each status. Same data and status colors as today.

## Requirements

- Rewrite `components/ui/floor-heatmap.tsx`; keep the `{ rooms, className }` props
  (only consumer is `dashboard/page.tsx`).
- Group rooms by floor, descending (top floor first) — unchanged. `F{n}` label left.
- Per floor: a full-width track (`h-4`, `rounded-sm`, `overflow-hidden`,
  `bg-surface-sunken`). Inside, one segment per status present on that floor, width
  proportional via `flexGrow = count`, `minWidth` ~3px so a 1-room status stays
  visible. Reuse the existing `bg-status-*` color tokens (matches the legend).
- Fixed left-to-right segment order: occupied → available → dirty → cleaning →
  inspected → maintenance → reserved → blocked → checkout-pending → ready.
- Each segment: hover tooltip `"{Status} · {count}"`.
- Floor's total room count shown muted on the right.
- The dashboard's existing legend and "Open rack" link stay as-is. No navigation on
  the bar (the dots had none).

## Out of scope

- Legend / "Open rack" changes; click-to-rack navigation.

## Verification

Open the dashboard: each floor shows a proportional stacked status bar; segment
widths reflect counts; hovering shows status + count; colors match the legend.
