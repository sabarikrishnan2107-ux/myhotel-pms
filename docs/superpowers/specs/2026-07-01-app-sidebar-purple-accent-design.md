# App-wide sidebar — purple accent (theme-only)

**Date:** 2026-07-01
**Status:** Approved (design)

## Problem

After building the `/dashboard-v2` prototype with a purple/navy palette, the user
wants the **real, shared app sidebar** (`components/shell/sidebar.tsx`, used by
every page under `(app)/`) to pick up the purple active-item accent — without
losing any of its real functionality (full ~40-item nav, role/module
filtering, hover-expand, badges, light/dark support).

## Decision

Change only the two CSS custom properties that drive the sidebar's active-item
color in `luxe-pms/src/app/globals.css`, in both the light-theme `:root` block
and the `.dark` block. No component code changes — `Sidebar.tsx` already reads
these variables dynamically via `hsl(var(--sidebar-active))` /
`hsl(var(--sidebar-active-bg))`.

| Variable | Current (light, line 106-107) | Current (dark, line 174-175) | New (both) |
|---|---|---|---|
| `--sidebar-active` | `40 74% 44%` (gold) | `40 80% 55%` (gold) | `252 100% 65%` (`#6D4AFF` purple) |
| `--sidebar-active-bg` | `40 60% 18%` | `40 60% 16%` | `252 55% 18%` (dark purple tint) |

`252 100% 65%` is the exact HSL equivalent of `#6D4AFF`, the purple used in the
`/dashboard-v2` prototype's active nav pill. `--sidebar-active-bg` gets a
matching dark-purple wash (same saturation/lightness family as the tint it
replaces, hue shifted to match).

## Out of scope

- `--sidebar-bg` / `--sidebar-bg-elevated` (background navy) — unchanged.
- Logo, wordmark, "MYHOTEL" brand text — unchanged.
- `--brand`, `--accent`, `--ring` (global button/focus-ring colors used
  outside the sidebar) — unchanged. This task touches sidebar-scoped
  variables only.
- Nav items, groups, role/module filtering, hover-expand behavior, badges —
  all unchanged (no logic touched, CSS-only change).
- `/dashboard-v2` itself — already has its own independent purple styling,
  untouched by this change.

## Verification

Open any page under `(app)/` (e.g. `/dashboard`, `/rack`) in both light and
dark mode: the active nav item's left indicator bar, icon, and label render
in purple instead of gold; the active item's background wash is a dark purple
tint instead of dark gold. Everything else on the sidebar (items, groups,
hover-expand, badges, logo) is pixel-identical to before.
