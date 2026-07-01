# DashboardV2 Dark/Light Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light/dark toggle icon to the `/dashboard-v2` header and make every dashboard-v2 component render a professional dark theme when toggled, without touching the app-wide CSS tokens used elsewhere.

**Architecture:** A new 2-state `ThemeToggleV2` component (built on the `next-themes` hook already wired into the root layout) is added to `top-header.tsx`. Every dashboard-v2 component gets Tailwind `dark:` arbitrary-value variants added alongside its existing hardcoded light hex colors — using a fixed palette of dark equivalents (defined below) that stays in dashboard-v2's own cool-navy/purple/gold hue family, deliberately not reusing the app-wide ivory `globals.css` tokens.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS v4 (`@custom-variant dark`), `next-themes` (already a dependency), `lucide-react` icons.

## Global Constraints

- Do not edit `globals.css`, `theme-provider.tsx`, or `components/shell/theme-toggle.tsx` — this task is scoped entirely to `luxe-pms/src/components/dashboard-v2/*` and `luxe-pms/src/app/dashboard-v2/page.tsx`.
- Do not modify `occupancy-hero.tsx`, `ai-briefing-card.tsx`, or `sidebar.tsx` (dashboard-v2) — they're already always-dark hero/frame panels by design and need no changes.
- Every light-mode hex value that already exists in a file must be preserved exactly as-is; only add `dark:` variants alongside it. No existing light-mode class name or value may change.
- This codebase has zero component-level tests (no `@testing-library/react`, no jsdom) — confirmed via `find src -iname "*.test.*"`, which only turns up pure-logic tests under `src/lib/`. Do not add a new testing framework for this cosmetic task. Each task's verification is `npx tsc --noEmit` (must exit clean) plus a manual visual check; final task adds `npm run lint` and `npm run test` and a full visual pass per the spec's Verification section.
- Dark palette (use these exact hex values everywhere below — do not invent new ones):

  | Role | dark: value |
  |---|---|
  | Card surface (replaces `bg-white`) | `#141B2E` |
  | Recessed surface (replaces `#F7F8FC` used as a bg, e.g. search box/hover/pill) | `#1B2338` |
  | Page background (replaces `#F7F8FC` used as the page wrapper bg) | `#0B0F1D` |
  | Primary text (replaces `#111827`) | `#E8ECF4` |
  | Muted text (replaces `#6B7280`) | `#8B94A8` |
  | Border (replaces `#E5E7EB`) | `#26304A` |
  | Purple tone soft/text (replaces `#EEEAFF` / `#6D4AFF` soft-tint pairs) | `#2A2152` / `#B4A3FF` |
  | Gold tone soft/text (replaces `#FDF3D6` / `#B8860B`) | `#3A2E12` / `#F0C550` |
  | Green tone soft/text (replaces `#DCFCE7` / `#16A34A`) | `#123822` / `#4ADE80` |
  | Blue tone soft/text (replaces `#DBEAFE` / `#2563EB`) | `#16233F` / `#60A5FA` |
  | Pink tone soft/text (replaces `#FFE4E9` / `#E11D48`) | `#3A1520` / `#FB7185` |
  | Blocked-status soft/text (replaces `#E5E7EB` / `#6B7280` as a status pair) | `#2A3441` / `#9CA3AF` |

  Solid/saturated colors (`#6D4AFF`, `#F5B800`, `#F43F5E`, and any `text-white` paired with them) are **never** given a `dark:` variant — they stay identical in both themes.

---

### Task 0: Commit pre-existing uncommitted work

Several files this plan touches (`top-header.tsx`, `kpi-card.tsx`,
`room-status-grid.tsx`, `arrival-departure-card.tsx`, `occupancy-hero.tsx`,
`sidebar.tsx`, `mock-data.ts`, `types.ts`, `page.tsx`,
`components/shell/sidebar.tsx`) already have uncommitted changes in the
working tree from earlier dashboard-v2 redesign work (matches the specs
`2026-07-01-dashboard-v2-redesign-design.md`,
`2026-07-01-dashboard-cards-visual-polish-design.md`,
`2026-07-01-dashboard-v2-sidebar-hover-expand-design.md`, and
`2026-07-01-app-sidebar-purple-accent-design.md`). Commit that work first so
every commit made by Tasks 1-9 below is a clean, isolated dark-mode diff.

**Files:** none created — this stages and commits whatever is currently
uncommitted.

- [ ] **Step 1: Review what's currently uncommitted**

Run: `git status` and `git diff --stat` from the repo root.
Expected: modified files matching the list above (occupancy hero
redesign, sidebar hover-expand, purple accent, mock-data/type tweaks).

- [ ] **Step 2: Commit it as its own commit**

```bash
git add luxe-pms/src/app/dashboard-v2/page.tsx luxe-pms/src/components/dashboard-v2/arrival-departure-card.tsx luxe-pms/src/components/dashboard-v2/kpi-card.tsx luxe-pms/src/components/dashboard-v2/mock-data.ts luxe-pms/src/components/dashboard-v2/occupancy-hero.tsx luxe-pms/src/components/dashboard-v2/room-status-grid.tsx luxe-pms/src/components/dashboard-v2/sidebar.tsx luxe-pms/src/components/dashboard-v2/top-header.tsx luxe-pms/src/components/dashboard-v2/types.ts luxe-pms/src/components/shell/sidebar.tsx
git commit -m "feat(dashboard-v2): visual redesign polish, sidebar hover-expand, purple accent"
```

- [ ] **Step 3: Verify the tree is clean**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

---

### Task 1: Theme toggle component + header wiring

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/theme-toggle.tsx`
- Modify: `luxe-pms/src/components/dashboard-v2/top-header.tsx`

**Interfaces:**
- Produces: `ThemeToggleV2` — a zero-prop React component, default export is named (`export function ThemeToggleV2()`), imported as `import { ThemeToggleV2 } from "./theme-toggle";`.

- [ ] **Step 1: Create the toggle component**

Write `luxe-pms/src/components/dashboard-v2/theme-toggle.tsx`:

```tsx
"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleV2() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-10 w-10 rounded-xl flex items-center justify-center text-[#6B7280] dark:text-[#8B94A8] shrink-0"
        aria-label="Toggle theme"
      >
        <Sun className="h-[18px] w-[18px]" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-10 w-10 rounded-xl flex items-center justify-center text-[#6B7280] dark:text-[#8B94A8] hover:bg-[#F7F8FC] dark:hover:bg-[#1B2338] hover:text-[#111827] dark:hover:text-[#E8ECF4] transition-colors shrink-0"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Theme: ${isDark ? "dark" : "light"}`}
    >
      {isDark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}
```

- [ ] **Step 2: Wire it into the header and convert the header's own colors**

Replace the full contents of `luxe-pms/src/components/dashboard-v2/top-header.tsx` with:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { Search, Plus, Bell, Clock, ChevronDown } from "lucide-react";
import { initials } from "@/lib/utils";
import { ThemeToggleV2 } from "./theme-toggle";

interface Props {
  notificationCount: number;
  currentUser: { name: string; role: string; shift: string };
}

export function TopHeaderV2({ notificationCount, currentUser }: Props) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock value only exists client-side
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const timeLabel = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "--:--";
  const dateLabel = now
    ? `${now.toLocaleDateString([], { weekday: "long" })}, ${now.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })}`
    : "";

  return (
    <header className="sticky top-0 z-20 h-20 flex items-center gap-4 bg-white dark:bg-[#141B2E] px-6 border-b border-[#E5E7EB] dark:border-[#26304A]">
      <div className="w-80 shrink-0">
        <div className="flex items-center gap-2 rounded-xl bg-[#F7F8FC] dark:bg-[#1B2338] px-3.5 py-2.5 text-sm text-[#6B7280] dark:text-[#8B94A8]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search by guest, booking, room...</span>
          <kbd className="text-[10px] font-semibold text-[#6B7280]/70 dark:text-[#8B94A8]/70 border border-[#E5E7EB] dark:border-[#26304A] rounded px-1.5 py-0.5">⌘K</kbd>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 pr-2">
          <Clock className="h-4 w-4 text-[#6B7280] dark:text-[#8B94A8]" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#111827] dark:text-[#E8ECF4] tabular-nums">{timeLabel}</p>
            <p className="text-[11px] text-[#6B7280] dark:text-[#8B94A8]">{dateLabel}</p>
          </div>
        </div>
        <Link
          href="/bookings/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6D4AFF] text-white text-sm font-semibold px-4 py-2.5 shadow-md shadow-[#6D4AFF]/25 hover:bg-[#5d3ce6] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" /> New Booking
        </Link>
        <ThemeToggleV2 />
        <button type="button" className="relative h-10 w-10 rounded-xl flex items-center justify-center text-[#6B7280] dark:text-[#8B94A8] hover:bg-[#F7F8FC] dark:hover:bg-[#1B2338] hover:text-[#111827] dark:hover:text-[#E8ECF4] transition-colors shrink-0" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>
        <button type="button" className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB] dark:border-[#26304A] shrink-0">
          <span className="h-10 w-10 rounded-full bg-[#EEEAFF] dark:bg-[#2A2152] text-[#6D4AFF] dark:text-[#B4A3FF] flex items-center justify-center text-sm font-bold">
            {initials(currentUser.name)}
          </span>
          <div className="hidden xl:block leading-tight text-left">
            <p className="text-sm font-semibold text-[#111827] dark:text-[#E8ECF4]">{currentUser.name}</p>
            <p className="text-[11px] text-[#6D4AFF]/70">{currentUser.role} · {currentUser.shift}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-[#6B7280] dark:text-[#8B94A8] hidden xl:block" />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 4: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/theme-toggle.tsx luxe-pms/src/components/dashboard-v2/top-header.tsx
git commit -m "feat(dashboard-v2): add dark/light toggle to header"
```

---

### Task 2: Tone tokens + KPI cards

**Files:**
- Modify: `luxe-pms/src/components/dashboard-v2/tokens.ts`
- Modify: `luxe-pms/src/components/dashboard-v2/kpi-card.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TONE_STYLES[tone].soft` and `.text` now each contain a light class and a `dark:` class (e.g. `"bg-[#EEEAFF] dark:bg-[#2A2152]"`) — every existing consumer (`kpi-card.tsx`, `activity-feed.tsx`, `priorities-list.tsx`, `quick-action-tile.tsx`, `ai-briefing-card.tsx`) picks up the dark variant automatically since they all just interpolate `${s.soft} ${s.text}` into a template string; none of those other files need to change for this.

- [ ] **Step 1: Add dark pairs to `TONE_STYLES`**

Replace the contents of `luxe-pms/src/components/dashboard-v2/tokens.ts`:

```ts
export type ToneV2 = "purple" | "gold" | "green" | "blue" | "pink";

export const TONE_STYLES: Record<ToneV2, { soft: string; text: string }> = {
  purple: { soft: "bg-[#EEEAFF] dark:bg-[#2A2152]", text: "text-[#6D4AFF] dark:text-[#B4A3FF]" },
  gold:   { soft: "bg-[#FDF3D6] dark:bg-[#3A2E12]", text: "text-[#B8860B] dark:text-[#F0C550]" },
  green:  { soft: "bg-[#DCFCE7] dark:bg-[#123822]", text: "text-[#16A34A] dark:text-[#4ADE80]" },
  blue:   { soft: "bg-[#DBEAFE] dark:bg-[#16233F]", text: "text-[#2563EB] dark:text-[#60A5FA]" },
  pink:   { soft: "bg-[#FFE4E9] dark:bg-[#3A1520]", text: "text-[#E11D48] dark:text-[#FB7185]" },
};
```

- [ ] **Step 2: Convert `kpi-card.tsx`'s own card colors**

Replace the contents of `luxe-pms/src/components/dashboard-v2/kpi-card.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";
import { TONE_STYLES, type ToneV2 } from "./tokens";

interface Props {
  label: string;
  value: number | string;
  badge?: string;
  caption: string;
  icon: LucideIcon;
  tone: ToneV2;
}

export function KpiCardV2({ label, value, badge, caption, icon: Icon, tone }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <div className="relative rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      {badge && (
        <span className={`absolute top-5 right-5 text-[11px] font-bold rounded-md px-1.5 py-0.5 ${s.soft} ${s.text}`}>{badge}</span>
      )}
      <div className="flex items-center gap-3">
        <span className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
          <Icon className="h-6 w-6" />
        </span>
        <p className={`text-sm uppercase tracking-[0.1em] font-semibold truncate ${s.text}`}>{label}</p>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#E8ECF4] text-center">{value}</p>
      <p className="text-[11px] text-[#6B7280] dark:text-[#8B94A8] mt-2 text-center">{caption}</p>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 4: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/tokens.ts luxe-pms/src/components/dashboard-v2/kpi-card.tsx
git commit -m "feat(dashboard-v2): dark-mode tone tokens and KPI cards"
```

---

### Task 3: Page background

**Files:**
- Modify: `luxe-pms/src/app/dashboard-v2/page.tsx`

- [ ] **Step 1: Convert the page wrapper background**

In `luxe-pms/src/app/dashboard-v2/page.tsx`, change:

```tsx
    <div className="flex min-h-svh bg-[#F7F8FC]">
```

to:

```tsx
    <div className="flex min-h-svh bg-[#F7F8FC] dark:bg-[#0B0F1D]">
```

- [ ] **Step 2: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/app/dashboard-v2/page.tsx
git commit -m "feat(dashboard-v2): dark-mode page background"
```

---

### Task 4: Arrival/departure card

**Files:**
- Modify: `luxe-pms/src/components/dashboard-v2/arrival-departure-card.tsx`

(`arrivals-card.tsx` and `departures-card.tsx` just pass props through to this component — no changes needed there.)

- [ ] **Step 1: Convert the card**

Replace the contents of `luxe-pms/src/components/dashboard-v2/arrival-departure-card.tsx`:

```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ArrivalDepartureRowV2 } from "./types";
import { initials } from "@/lib/utils";

interface Props {
  title: string;
  icon: LucideIcon;
  summary: string;
  rows: ArrivalDepartureRowV2[];
  viewAllHref: string;
  emptyLabel: string;
}

export function ArrivalDepartureCardV2({ title, icon: Icon, summary, rows, viewAllHref, emptyLabel }: Props) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <span className="h-12 w-12 rounded-xl bg-[#EEEAFF] dark:bg-[#2A2152] text-[#6D4AFF] dark:text-[#B4A3FF] flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6" />
          </span>
          <p className="text-sm font-bold text-[#111827] dark:text-[#E8ECF4] uppercase tracking-[0.06em]">{title}</p>
        </div>
        <Link href={viewAllHref} className="text-xs font-semibold text-[#6D4AFF] hover:underline">View all</Link>
      </div>
      <p className="text-xs text-[#6B7280] dark:text-[#8B94A8] mb-3 pl-[58px]">{summary}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-[#8B94A8] text-center py-6">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.id} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] dark:border-[#26304A] px-3 py-2.5">
              <span className="h-9 w-9 rounded-full bg-[#F5B800] text-[#101A33] flex items-center justify-center text-xs font-bold shrink-0">
                {initials(row.guestName)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#111827] dark:text-[#E8ECF4] truncate">{row.guestName}</p>
                  {row.tag && <span className="text-[10px] font-bold rounded-full bg-[#EEEAFF] dark:bg-[#2A2152] text-[#6D4AFF] dark:text-[#B4A3FF] px-2 py-0.5 shrink-0">{row.tag}</span>}
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#8B94A8] truncate mt-0.5">{row.meta}</p>
              </div>
              {row.status === "settled" && (
                <span className="text-[11px] font-semibold text-[#16A34A] dark:text-[#4ADE80] shrink-0">Settled</span>
              )}
              <button type="button" className="text-xs font-semibold rounded-lg bg-[#6D4AFF] text-white px-3 py-1.5 shrink-0">
                {row.actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/arrival-departure-card.tsx
git commit -m "feat(dashboard-v2): dark-mode arrival/departure card"
```

---

### Task 5: Activity feed

**Files:**
- Modify: `luxe-pms/src/components/dashboard-v2/activity-feed.tsx`

- [ ] **Step 1: Convert the card**

Replace the contents of `luxe-pms/src/components/dashboard-v2/activity-feed.tsx`:

```tsx
import type { ActivityItemV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  items: ActivityItemV2[];
}

export function ActivityFeedV2({ items }: Props) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] dark:text-[#E8ECF4] uppercase tracking-[0.08em]">Recent Activity</p>
        <button type="button" className="text-xs font-semibold text-[#6D4AFF] hover:underline">View all</button>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {items.map(item => {
          const s = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111827] dark:text-[#E8ECF4] truncate">{item.title}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#8B94A8] truncate">{item.actor} · {item.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/activity-feed.tsx
git commit -m "feat(dashboard-v2): dark-mode activity feed"
```

---

### Task 6: Priorities list

**Files:**
- Modify: `luxe-pms/src/components/dashboard-v2/priorities-list.tsx`

- [ ] **Step 1: Convert the card**

Replace the contents of `luxe-pms/src/components/dashboard-v2/priorities-list.tsx`:

```tsx
import type { PriorityItemV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  items: PriorityItemV2[];
}

export function PrioritiesListV2({ items }: Props) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] dark:text-[#E8ECF4] uppercase tracking-[0.08em]">Today&apos;s Priorities</p>
        <span className="text-[11px] font-bold rounded-full bg-[#F7F8FC] dark:bg-[#1B2338] text-[#6B7280] dark:text-[#8B94A8] px-2.5 py-1">{items.length} Items</span>
      </div>
      <ul className="space-y-1">
        {items.map(item => {
          const s = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F7F8FC] dark:hover:bg-[#1B2338] transition-colors cursor-pointer">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#111827] dark:text-[#E8ECF4]">{item.title}</p>
                  {typeof item.count === "number" && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${s.soft} ${s.text}`}>{item.count}</span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] dark:text-[#8B94A8] mt-0.5 truncate">{item.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/priorities-list.tsx
git commit -m "feat(dashboard-v2): dark-mode priorities list"
```

---

### Task 7: Quick action tiles

**Files:**
- Modify: `luxe-pms/src/components/dashboard-v2/quick-action-tile.tsx`

- [ ] **Step 1: Convert the tile**

Replace the contents of `luxe-pms/src/components/dashboard-v2/quick-action-tile.tsx`:

```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { TONE_STYLES, type ToneV2 } from "./tokens";

interface Props {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: ToneV2;
  badge?: number;
}

export function QuickActionTileV2({ label, href, icon: Icon, tone, badge }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <Link
      href={href}
      className="relative rounded-2xl bg-white dark:bg-[#141B2E] p-4 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)] hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col items-center text-center gap-2.5"
    >
      <span className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.soft} ${s.text}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-[#111827] dark:text-[#E8ECF4]">{label}</p>
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute top-3 right-3 h-5 min-w-[20px] px-1 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/quick-action-tile.tsx
git commit -m "feat(dashboard-v2): dark-mode quick action tiles"
```

---

### Task 8: Room status grid

**Files:**
- Modify: `luxe-pms/src/components/dashboard-v2/room-status-grid.tsx`

- [ ] **Step 1: Convert the grid**

Replace the contents of `luxe-pms/src/components/dashboard-v2/room-status-grid.tsx`:

```tsx
import type { FloorRowV2, RoomStatusV2 } from "./types";

const STATUS_STYLE: Record<RoomStatusV2, string> = {
  available: "bg-[#DCFCE7] dark:bg-[#123822] text-[#16A34A] dark:text-[#4ADE80]",
  occupied: "bg-[#F5B800] text-white",
  reserved: "bg-[#DBEAFE] dark:bg-[#16233F] text-[#2563EB] dark:text-[#60A5FA]",
  "out-of-order": "bg-[#F43F5E] text-white",
  blocked: "bg-[#E5E7EB] dark:bg-[#2A3441] text-[#6B7280] dark:text-[#9CA3AF]",
};

const LEGEND_DOT: Record<RoomStatusV2, string> = {
  available: "bg-[#22C55E]",
  occupied: "bg-[#F5B800]",
  reserved: "bg-[#3B82F6]",
  "out-of-order": "bg-[#F43F5E]",
  blocked: "bg-[#9CA3AF]",
};

interface Props {
  floors: FloorRowV2[];
  legend: { status: RoomStatusV2; label: string }[];
}

export function RoomStatusGridV2({ floors, legend }: Props) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] dark:text-[#E8ECF4] uppercase tracking-[0.08em]">Live Room Status</p>
        <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#8B94A8] border border-[#E5E7EB] dark:border-[#26304A] rounded-lg px-2.5 py-1">All Floors</span>
      </div>
      <div className="space-y-2">
        {floors.map(row => (
          <div key={row.floor} className="flex items-center gap-2.5">
            <span className="w-7 text-[11px] font-bold text-[#6B7280] dark:text-[#8B94A8] shrink-0">{row.floor}</span>
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {row.rooms.map(room => (
                <span
                  key={room.number}
                  className={`h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${STATUS_STYLE[room.status]}`}
                >
                  {room.number}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-[#26304A] flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#6B7280] dark:text-[#8B94A8]">
        {legend.map(l => (
          <span key={l.status} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${LEGEND_DOT[l.status]}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: exits with no output and status 0.

- [ ] **Step 3: Commit**

```bash
git add luxe-pms/src/components/dashboard-v2/room-status-grid.tsx
git commit -m "feat(dashboard-v2): dark-mode room status grid"
```

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full typecheck, lint, and unit test suite**

Run: `cd luxe-pms && npx tsc --noEmit && npm run lint && npm run test`
Expected: all three exit with status 0 (unit tests are unrelated `src/lib` logic tests — must still pass unchanged).

- [ ] **Step 2: Start the dev server**

Run: `cd luxe-pms && npm run dev` (background)
Expected: server starts on its configured port with no errors.

- [ ] **Step 3: Visual check — light mode baseline**

Open `/dashboard-v2` in a browser. Confirm it looks pixel-identical to how it looked before this plan (screenshot comparison against current behavior): white cards, purple/gold accents, no layout shift, header unchanged except for the new sun icon between "New Booking" and the bell.

- [ ] **Step 4: Visual check — toggle to dark and inspect every section**

Click the new toggle icon. Confirm, per the design spec's Verification section:
- Icon swaps to a moon, theme flips instantly, no flash of unstyled content.
- Every card (KPIs, occupancy hero, arrivals, departures, activity feed, priorities, room status grid, AI briefing, quick action tiles) shows a dark navy surface with legible light text — no white cards, no invisible/low-contrast text anywhere.
- Purple (`#6D4AFF`) and gold (`#F5B800`) accents (CTA button, avatar badge, occupied room cells, sidebar logo) are visually unchanged and still pop against the dark surfaces.
- Room status grid and tone badges (KPI badges, priority icons, activity icons) show tinted-but-legible colors — no washed-out pale badges on dark cards.
- Occupancy hero, AI briefing card, and the sidebar look the same as before (they were already dark and untouched).

- [ ] **Step 5: Visual check — toggle back to light**

Click the toggle again. Confirm the page returns to the exact light-mode appearance checked in Step 3.

- [ ] **Step 6: Cross-page check**

While in dark mode, navigate to another page (e.g. `/bookings`). Confirm it renders in dark mode too (expected — theme is a global `next-themes` setting) and that this page still looks correct (it was already dark-mode-ready before this plan; this step just confirms no regression).

- [ ] **Step 7: Stop the dev server**

Stop the background dev server process started in Step 2.
