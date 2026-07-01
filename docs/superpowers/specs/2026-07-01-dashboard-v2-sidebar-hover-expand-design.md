# DashboardV2 sidebar — hover-to-expand

**Date:** 2026-07-01
**Status:** Approved (design)

## Problem

`SidebarV2` (`luxe-pms/src/components/dashboard-v2/sidebar.tsx`) is currently a
fixed `w-64` sidebar, always fully expanded. The user wants it to match the
real app sidebar's (`components/shell/sidebar.tsx`) hover-to-expand behavior:
collapsed to a narrow icon-only rail by default, expanding to full width with
labels on mouse-over.

## Decision

Port the existing, already-shipped hover-expand pattern from
`components/shell/sidebar.tsx` into `SidebarV2` — same mechanism
(`expanded` state via `onMouseEnter`/`onMouseLeave`, a layout spacer to
reserve the collapsed rail width in document flow, a fixed-position `<aside>`
that overlays wider when expanded, label/wordmark opacity transitions), only
the widths and colors change to match DashboardV2's existing 256px design
(collapsed: `w-14` / 56px, expanded: `w-64` / 256px — narrower than the real
sidebar's 288px since DashboardV2's items have shorter labels and no groups).

- Logo crest ("PP") stays visible when collapsed; wordmark text
  ("The Pearl Palace" / tagline) fades via `opacity-0`/`opacity-100`.
- Nav item labels fade the same way; icons stay visible and centered when
  collapsed.
- `page.tsx`'s content wrapper offset changes from `lg:pl-64` to `lg:pl-14`
  to match the new collapsed rail width (the expanded sidebar overlays on top
  of content via `fixed` positioning + `z-30`, same as the real sidebar, so
  content doesn't need to react to the expand/collapse transition itself).

## Out of scope

- The real app sidebar (`components/shell/sidebar.tsx`) — unchanged, already
  has this behavior.
- Nav items, colors, routes — unchanged from the current `SidebarV2`.
- Mobile — `SidebarV2` is already `hidden lg:flex` (desktop-only, per the
  original DashboardV2 spec); no mobile drawer behavior added.

## Verification

Open `/dashboard-v2` at desktop width: sidebar shows as a narrow ~56px icon
rail by default (PP crest + icons only, no text). Moving the mouse over the
sidebar expands it smoothly to ~256px with the wordmark and all labels
fading in; moving the mouse away collapses it back. Content area has no gap
or overlap in either state.
