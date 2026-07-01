# DashboardV2 — header dark/light toggle + full dark mode

**Date:** 2026-07-01
**Status:** Approved (design)

## Problem

`/dashboard-v2` has no way to switch themes, and every component in
`components/dashboard-v2/` is built with hardcoded light-only hex colors
(`bg-white`, `#111827`, `#6B7280`, `#E5E7EB`, `#F7F8FC`, plus tone tints in
`tokens.ts`). The rest of the app already has working dark mode
(`next-themes`, `ThemeProvider` in root layout, a shared `ThemeToggle` in
`components/shell/theme-toggle.tsx`, full CSS-variable tokens in
`globals.css`) — but theme is global (one `.dark` class on `<html>`), so as
soon as dark mode is toggled on anywhere, dashboard-v2 would render broken
(dark-mode-agnostic white cards, invisible text) unless its own components
learn to respond to the theme.

The user wants: a light/dark toggle icon in the dashboard-v2 header, and a
dark mode that looks professional across the whole page, not just the
header shell.

## Decision

### 1. New toggle component

`components/dashboard-v2/theme-toggle.tsx` (new file), client component:
- Uses `next-themes`' `useTheme()` — same library already in the root
  layout, no new dependency.
- Two states only (light ⇄ dark, no "system") — simpler than the shared
  3-state `ThemeToggle`, matching the user's "dark and white mode icon" ask.
- `Sun` icon in light mode, `Moon` icon in dark mode (from `lucide-react`,
  already a dependency).
- Mounted-guard pattern copied from the existing `ThemeToggle` (renders a
  neutral placeholder until mounted, avoiding SSR/hydration mismatch).
- Sized to match the header's other icon buttons: `h-10 w-10 rounded-xl`,
  same hover treatment as the notification bell.

### 2. Header wiring

`top-header.tsx`: import and render `<ThemeToggleV2 />` between the "New
Booking" link (line 42-47) and the notification bell button (line 48),
inside the `ml-auto flex items-center gap-4` right-hand cluster (line 34).

### 3. Color strategy — dashboard-v2 keeps its own dark palette

Dashboard-v2's neutral colors (`#F7F8FC`/`#E5E7EB`/`#6B7280`/`#111827`, a
cool blue-gray family) and its hero panels (navy gradients
`#1E2761→#2D1B69`, `#101A33→#1E2A4A`, sidebar `#101A33`) are a different hue
family from the main app's warm-ivory CSS tokens in `globals.css`
(`--background: 40 27% 97%`). Reusing the app-wide tokens would shift
dashboard-v2's light-mode look and clash with its own already-dark hero
elements. So this task does **not** touch `globals.css` or any shared
token — it adds `dark:` Tailwind arbitrary-value variants directly in
dashboard-v2 components, picking dark equivalents in the same cool-navy
family the hero panels already use. This is a self-contained, scoped
change with zero blast radius on the rest of the app.

**Core neutral palette (new dark values, light values unchanged):**

| Role | Light (existing) | Dark (new) |
|---|---|---|
| Page background | `#F7F8FC` | `#0B0F1D` |
| Card surface | `bg-white` | `#141B2E` |
| Recessed surface (search box, pill bg, hover bg) | `#F7F8FC` | `#1B2338` |
| Primary text | `#111827` | `#E8ECF4` |
| Muted text | `#6B7280` | `#8B94A8` |
| Border | `#E5E7EB` | `#26304A` |

**Brand accents — unchanged in both themes** (vivid enough to read on the
new dark card surface, and are dashboard-v2's visual signature):
`#6D4AFF` purple, `#F5B800` gold, and all solid-color badges (e.g.
`bg-[#F5B800] text-[#101A33]`, `bg-[#F43F5E] text-white`).

**Tone "soft" tints (`tokens.ts` `TONE_STYLES`) — new dark pairs:**

| Tone | Light soft / text | Dark soft / text |
|---|---|---|
| purple | `#EEEAFF` / `#6D4AFF` | `#2A2152` / `#B4A3FF` |
| gold | `#FDF3D6` / `#B8860B` | `#3A2E12` / `#F0C550` |
| green | `#DCFCE7` / `#16A34A` | `#123822` / `#4ADE80` |
| blue | `#DBEAFE` / `#2563EB` | `#16233F` / `#60A5FA` |
| pink | `#FFE4E9` / `#E11D48` | `#3A1520` / `#FB7185` |

**Room status colors (`room-status-grid.tsx`) — new dark pairs:**

| Status | Light | Dark |
|---|---|---|
| available | `#DCFCE7` / `#16A34A` | `#123822` / `#4ADE80` (reuses green tone) |
| reserved | `#DBEAFE` / `#2563EB` | `#16233F` / `#60A5FA` (reuses blue tone) |
| blocked | `#E5E7EB` / `#6B7280` | `#2A3441` / `#9CA3AF` |
| occupied, out-of-order | solid `#F5B800`/`#F43F5E` + white text | unchanged (already high-contrast) |

Legend dots (small solid color swatches) stay unchanged in both themes —
already vivid enough against either background.

### 4. Files touched

| File | Change |
|---|---|
| `theme-toggle.tsx` (new) | 2-state toggle component |
| `top-header.tsx` | render toggle; core neutral palette on header/search/icons; keep `#6D4AFF`/`#F5B800` accents; avatar badge (`#EEEAFF`/`#6D4AFF`) gets the purple tone's dark pair (`#2A2152`/`#B4A3FF`) |
| `page.tsx` | page background `#F7F8FC` → dark `#0B0F1D` |
| `kpi-card.tsx` | card surface + text mapping |
| `arrival-departure-card.tsx` | card surface + text mapping; purple "soft" icon badge + tag get dark pair; "Settled" green text gets dark pair |
| `activity-feed.tsx` | card surface + text mapping |
| `priorities-list.tsx` | card surface + text mapping; pill + hover bg use recessed-surface dark value |
| `quick-action-tile.tsx` | card surface + text mapping |
| `room-status-grid.tsx` | card surface + text mapping; `STATUS_STYLE` dark pairs |
| `tokens.ts` | `TONE_STYLES` dark pairs |

### 5. Explicitly unchanged

- `occupancy-hero.tsx`, `ai-briefing-card.tsx` — already dark navy-gradient
  hero panels by design; text is already white/white-opacity, reads fine
  regardless of app theme.
- `sidebar.tsx` (dashboard-v2) — already always-dark navy (`#101A33`),
  matching the app-wide convention that the sidebar is a permanent dark
  brand frame in both themes. No changes needed.
- Root layout, `globals.css`, shared `ThemeToggle`, `ThemeProvider` — no
  edits. `defaultTheme="light"` stays the app default; toggling on
  dashboard-v2 affects the whole app's theme (existing global behavior),
  which is correct since the rest of the app is already dark-mode-ready.

## Verification

1. On `/dashboard-v2`, click the new sun/moon icon in the header (between
   "New Booking" and the bell) — theme flips instantly, icon swaps
   sun ⇄ moon, no flash of unstyled content.
2. In dark mode, every card (KPIs, occupancy hero, arrivals, departures,
   activity, priorities, room grid, AI briefing, quick actions) renders
   with dark navy surfaces and legible light text — no white cards, no
   invisible/low-contrast text anywhere.
3. Purple and gold brand accents (CTA button, avatar badge, occupied room
   cells, sidebar logo) are visually unchanged and still pop against the
   new dark surfaces.
4. Room status grid and tone badges (KPI badges, priority icons, activity
   icons) show tinted-but-legible colors in dark mode — no washed-out pale
   badges on dark cards.
5. Toggling back to light mode restores the exact current (pre-change)
   light-mode appearance pixel-for-pixel.
6. Navigating from `/dashboard-v2` to another page (e.g. `/bookings`) while
   in dark mode keeps that page in dark mode too (expected — theme is
   global), confirming no regression to already-dark-mode-ready pages.
