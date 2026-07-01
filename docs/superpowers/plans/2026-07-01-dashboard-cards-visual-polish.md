# Dashboard Cards Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the refined visual styling (validated in `sample.html`) to the dashboard's Priorities / Live Status / Activity / AI Daily Briefing card row — markup and className changes only, no data or layout-structure changes.

**Architecture:** Six self-contained tasks. Two touch isolated shared components (`OccupancyGauge`, `FloorHeatmap`) with no consumers outside the dashboard. Four touch `dashboard/page.tsx` in sequence (Priorities → Live Status → Activity → AI Briefing), each editing only its own card's JSX block plus, where needed, appending new icons to the single top-of-file lucide-react import. Every task ends with the dashboard rendering correctly with the same underlying data as before.

**Tech Stack:** Next.js 16 (Turbopack), React client components, TypeScript, Tailwind v4 (CSS custom properties in `globals.css`, no external UI library), `lucide-react` icons, `class-variance-authority` for the `Badge` component.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-01-dashboard-cards-visual-polish-design.md`. Every task's requirements implicitly include that spec's "Requirements" section for its card.
- Edit only these three files: `luxe-pms/src/app/(app)/dashboard/page.tsx`, `luxe-pms/src/components/ui/occupancy-gauge.tsx`, `luxe-pms/src/components/ui/floor-heatmap.tsx`. No backend, routing, or other page changes.
- No data/prop/behavior changes — every task is markup/className only. `roomCounts`, `occPct`, `priorities`, `activity`, `aiBriefing` etc. keep producing the same values (aiBriefing gains an `icon` field in Task 6 — additive, not a behavior change).
- **Stop the dev server before editing**; after all edits do a clean restart (`rm -rf luxe-pms/.next/dev`) so changes compile — the file watcher misses direct disk writes on the D: drive in this environment.
- `dashboard/page.tsx` and `floor-heatmap.tsx` use **CRLF** line endings — preserve them. `occupancy-gauge.tsx` uses **LF** — preserve that.
- Verification gate per task: `npx tsc --noEmit` and `npx eslint <file>` clean for the edited file (no new errors — an unused `lucide-react` import is a new eslint error, so only add an icon import in the same task that consumes it). There is no component unit-test framework in this app — beyond type-check/lint, verification is a manual browser check of `/dashboard`.
- Tailwind class names must be complete literal strings somewhere in the edited file (no runtime string interpolation of class names) — matches the existing `STATUS_BG` / `STATUS_STYLE` lookup-table pattern already used in this codebase (`floor-heatmap.tsx`, `badge.tsx`).

---

### Task 1: Occupancy gauge — gradient arc + bolder number

**Files:**
- Modify: `luxe-pms/src/components/ui/occupancy-gauge.tsx`

**Interfaces:**
- Consumes: nothing new — same `Props` (`value`, `size`, `thickness`, `label`, `hint`, `className`) as today.
- Produces: no interface change. Task 4 passes `size={188}` instead of `size={170}` at the call site — that's a prop value change in `dashboard/page.tsx`, not a signature change.

- [ ] **Step 1: Stop the dev server**

If the Next dev server is running, stop it now so the Edit tool does not race the formatter.

- [ ] **Step 2: Add a unique gradient id and gradient-backed stroke**

Find:

```tsx
/** Premium semi-circle occupancy gauge with tick marks. */
export function OccupancyGauge({ value, size = 200, thickness = 14, label = "Occupancy", hint, className }: Props) {
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color shifts based on value
  const stroke =
    value >= 80 ? "var(--color-success)" :
    value >= 60 ? "var(--color-brand)" :
    value >= 40 ? "var(--color-warning)" :
    "var(--color-danger)";

  return (
    <div className={cn("flex flex-col items-center justify-center", className)} style={{ width: size }}>
      <svg width={size} height={size / 2 + thickness} viewBox={`0 0 ${size} ${size / 2 + thickness}`}>
        {/* track */}
        <path
          d={`M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d={`M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
        />
```

Replace with:

```tsx
/** Premium semi-circle occupancy gauge with tick marks. */
export function OccupancyGauge({ value, size = 200, thickness = 14, label = "Occupancy", hint, className }: Props) {
  const gradientId = React.useId();
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color shifts based on value
  const stroke =
    value >= 80 ? "var(--color-success)" :
    value >= 60 ? "var(--color-brand)" :
    value >= 40 ? "var(--color-warning)" :
    "var(--color-danger)";

  return (
    <div className={cn("flex flex-col items-center justify-center", className)} style={{ width: size }}>
      <svg width={size} height={size / 2 + thickness} viewBox={`0 0 ${size} ${size / 2 + thickness}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.7} />
            <stop offset="100%" stopColor={stroke} stopOpacity={1} />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d={`M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* value */}
        <path
          d={`M ${thickness / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${cy}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
        />
```

- [ ] **Step 3: Bolder percentage number**

Find:

```tsx
      <div className="-mt-10 flex flex-col items-center">
        <p className="text-3xl font-semibold tabular tracking-tight">{value}%</p>
        <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mt-1">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
```

Replace with:

```tsx
      <div className="-mt-10 flex flex-col items-center">
        <p className="text-4xl font-bold tabular tracking-tight">{value}%</p>
        <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-muted-foreground mt-1">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
```

- [ ] **Step 4: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors.

Run: `cd luxe-pms && npx eslint src/components/ui/occupancy-gauge.tsx`
Expected: clean.

- [ ] **Step 5: Restart dev server and visually verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server per the project's normal start script.
Open `/dashboard` in a browser. Confirm: the occupancy arc shows a smooth gradient (not a flat single color) and the percentage number reads visibly bolder/larger than before. No console errors.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/components/ui/occupancy-gauge.tsx"
git commit -m "style(dashboard): gradient occupancy gauge arc + bolder number"
```

---

### Task 2: Floor heatmap — pill segments with gaps

**Files:**
- Modify: `luxe-pms/src/components/ui/floor-heatmap.tsx`

**Interfaces:**
- Consumes: nothing new — same `Props` (`rooms`, `className`) as today.
- Produces: no interface change.

- [ ] **Step 1: Stop the dev server** (skip if already stopped from Task 1)

- [ ] **Step 2: Give each floor's bar rounded, gapped segments**

Find:

```tsx
            <div className="flex-1 flex h-4 rounded-sm overflow-hidden bg-surface-sunken">
              {segments.map(seg => (
                <div
                  key={seg.status}
                  title={`${STATUS_LABEL[seg.status]} · ${seg.count}`}
                  style={{ flexGrow: seg.count, minWidth: 3 }}
                  className={cn("h-full transition-opacity hover:opacity-80 cursor-default", STATUS_BG[seg.status])}
                />
              ))}
            </div>
```

Replace with:

```tsx
            <div className="flex-1 flex h-4 gap-[2px] rounded-full bg-surface-sunken p-[1px]">
              {segments.map(seg => (
                <div
                  key={seg.status}
                  title={`${STATUS_LABEL[seg.status]} · ${seg.count}`}
                  style={{ flexGrow: seg.count, minWidth: 3 }}
                  className={cn("h-full rounded-full transition-opacity hover:opacity-80 cursor-default", STATUS_BG[seg.status])}
                />
              ))}
            </div>
```

- [ ] **Step 3: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors.

Run: `cd luxe-pms && npx eslint "src/components/ui/floor-heatmap.tsx"`
Expected: clean.

- [ ] **Step 4: Restart dev server and visually verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard`. Confirm: each floor's status bar now shows rounded-end, slightly gapped pill segments instead of one flat square-cornered bar; hovering a segment still shows its `title` tooltip; the multi-segment floors (e.g. one with both available and dirty rooms) show a visible gap between the two colors.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/components/ui/floor-heatmap.tsx"
git commit -m "style(dashboard): floor map segments as rounded gapped pills"
```

---

### Task 3: Priorities card — solid count badge, accent-bar rows, bigger icon chips

**Files:**
- Modify: `luxe-pms/src/app/(app)/dashboard/page.tsx` (Priorities `Card` block ~line 468, `PriorityRow` function ~line 646)

**Interfaces:**
- Consumes: existing `priorities` array (unchanged shape: `{ tone, icon, count?, title, hint, href }`).
- Produces: no interface change — `PriorityRow`'s prop signature is unchanged, only its internal markup.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Priorities card header — solid circular count instead of soft "N items" badge**

Find:

```tsx
        {/* Priorities */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Today&apos;s Priorities</p>
              <h2 className="text-lg font-semibold mt-0.5">What needs attention</h2>
            </div>
            <Badge tone="brand">{priorities.length} {priorities.length === 1 ? "item" : "items"}</Badge>
          </div>
```

Replace with:

```tsx
        {/* Priorities */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand font-bold flex items-center gap-1.5">
                <Bell className="h-3 w-3" /> Today&apos;s Priorities
              </p>
              <h2 className="text-xl font-semibold mt-1 tracking-tight">What needs attention</h2>
            </div>
            <span className="h-7 w-7 rounded-full bg-brand text-brand-foreground text-xs font-bold flex items-center justify-center shrink-0">
              {priorities.length}
            </span>
          </div>
```

- [ ] **Step 3: `PriorityRow` — left accent bar + bigger icon chip**

Find:

```tsx
function PriorityRow({ tone, icon: Icon, count, title, hint, href }: {
  tone: "danger" | "warning" | "info" | "accent";
  icon: typeof AlertTriangle;
  count?: number;
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken hover:border-brand transition-all group">
        <span className={cn(
          "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
          tone === "danger" && "bg-danger-soft text-danger",
          tone === "warning" && "bg-warning-soft text-warning",
          tone === "info" && "bg-info-soft text-info",
          tone === "accent" && "bg-accent-soft text-accent",
        )}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            {typeof count === "number" && (
              <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "info" ? "info" : "accent"}>{count}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
      </div>
    </Link>
  );
}
```

Replace with:

```tsx
const PRIORITY_ACCENT: Record<"danger" | "warning" | "info" | "accent", string> = {
  danger: "bg-danger", warning: "bg-warning", info: "bg-info", accent: "bg-accent",
};

function PriorityRow({ tone, icon: Icon, count, title, hint, href }: {
  tone: "danger" | "warning" | "info" | "accent";
  icon: typeof AlertTriangle;
  count?: number;
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="relative overflow-hidden flex items-center gap-3.5 p-3.5 pl-4 rounded-xl border border-border hover:bg-surface-sunken hover:border-brand transition-all group">
        <span className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r", PRIORITY_ACCENT[tone])} />
        <span className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
          tone === "danger" && "bg-danger-soft text-danger",
          tone === "warning" && "bg-warning-soft text-warning",
          tone === "info" && "bg-info-soft text-info",
          tone === "accent" && "bg-accent-soft text-accent",
        )}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{title}</p>
            {typeof count === "number" && (
              <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "info" ? "info" : "accent"}>{count}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors.

Run: `cd luxe-pms && npx eslint "src/app/(app)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 5: Restart dev server and visually verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard`. Confirm: the Priorities card header shows a bold gold eyebrow with a bell icon and a solid gold circle with the item count (no more "N items" pill); each priority row shows a thin colored bar on its left edge matching that row's tone, a slightly larger icon chip, and the chevron nudges right on hover.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/dashboard/page.tsx"
git commit -m "style(dashboard): priorities card header + accent-bar rows"
```

---

### Task 4: Live Status card — eyebrow icon, Live pill, bigger gauge, legend chips

**Files:**
- Modify: `luxe-pms/src/app/(app)/dashboard/page.tsx` (Live Status `Card` block ~line 496, `LegendDot` function ~line 681)

**Interfaces:**
- Consumes: `OccupancyGauge` (Task 1 — same props, just a larger `size`), `roomCounts` (unchanged).
- Produces: `LEGEND_STYLE` lookup table and `LegendChip` component replace `LegendDot` — no other file references `LegendDot` (verified: only used inside this file), so this is a safe rename/replace.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Add `Radio` to the lucide-react import**

Find:

```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

Replace with:

```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock, Radio,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

- [ ] **Step 3: Live Status header — eyebrow icon + filled "Live" pill + bigger gauge**

Find:

```tsx
        {/* Live Status — gauge + floor heatmap */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-subtle-foreground font-semibold">Live Status</p>
              <h2 className="text-lg font-semibold mt-0.5">{roomCounts.total} rooms · all floors</h2>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex flex-col items-center pt-1">
            <OccupancyGauge value={occPct} size={170} hint={`${roomCounts.occupied} of ${roomCounts.total} sold`} />
          </div>
```

Replace with:

```tsx
        {/* Live Status — gauge + floor heatmap */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-brand font-bold flex items-center gap-1.5">
                <Radio className="h-3 w-3" /> Live Status
              </p>
              <h2 className="text-xl font-semibold mt-1 tracking-tight">{roomCounts.total} rooms · all floors</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-bold bg-success-soft rounded-full px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex flex-col items-center pt-1">
            <OccupancyGauge value={occPct} size={188} hint={`${roomCounts.occupied} of ${roomCounts.total} sold`} />
          </div>
```

- [ ] **Step 4: Replace the legend dots with colored chips**

Find:

```tsx
            {/* Legend */}
            <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-[10px]">
              <LegendDot color="bg-status-occupied" label={`Occupied ${roomCounts.occupied}`} />
              <LegendDot color="bg-status-available" label={`Available ${roomCounts.available}`} />
              <LegendDot color="bg-status-dirty" label={`Dirty ${roomCounts.dirty}`} />
              <LegendDot color="bg-status-cleaning" label={`Cleaning ${roomCounts.cleaning}`} />
              <LegendDot color="bg-status-maintenance" label={`Maint ${roomCounts.maintenance}`} />
            </div>
```

Replace with:

```tsx
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium">
              <LegendChip tone="occupied" label="Occupied" count={roomCounts.occupied} />
              <LegendChip tone="available" label="Available" count={roomCounts.available} />
              <LegendChip tone="dirty" label="Dirty" count={roomCounts.dirty} />
              <LegendChip tone="cleaning" label="Cleaning" count={roomCounts.cleaning} />
              <LegendChip tone="maintenance" label="Maint" count={roomCounts.maintenance} />
            </div>
```

- [ ] **Step 5: Replace the `LegendDot` function with `LEGEND_STYLE` + `LegendChip`**

Find:

```tsx
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-sm", color)} />
      <span className="tabular">{label}</span>
    </span>
  );
}
```

Replace with:

```tsx
const LEGEND_STYLE: Record<"occupied" | "available" | "dirty" | "cleaning" | "maintenance", { bg: string; text: string; dot: string }> = {
  occupied:    { bg: "bg-status-occupied-soft",    text: "text-status-occupied",    dot: "bg-status-occupied" },
  available:   { bg: "bg-status-available-soft",   text: "text-status-available",   dot: "bg-status-available" },
  dirty:       { bg: "bg-status-dirty-soft",        text: "text-status-dirty",        dot: "bg-status-dirty" },
  cleaning:    { bg: "bg-status-cleaning-soft",     text: "text-status-cleaning",     dot: "bg-status-cleaning" },
  maintenance: { bg: "bg-status-maintenance-soft",  text: "text-status-maintenance",  dot: "bg-status-maintenance" },
};

function LegendChip({ tone, label, count }: { tone: keyof typeof LEGEND_STYLE; label: string; count: number }) {
  const s = LEGEND_STYLE[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", s.bg, s.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {label} {count}
    </span>
  );
}
```

- [ ] **Step 6: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors (in particular, no "LegendDot is not defined" — confirm no other reference remains).

Run: `cd luxe-pms && npx eslint "src/app/(app)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 7: Restart dev server and visually verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard`. Confirm: "Live Status" header shows a bold gold eyebrow with a radio icon; the "Live" indicator has a soft green pill background; the occupancy gauge is visibly larger; the floor-map legend renders as five colored rounded chips (not plain dots) with matching status colors.

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/app/(app)/dashboard/page.tsx"
git commit -m "style(dashboard): live status header, bigger gauge, legend chips"
```

---

### Task 5: Activity card — eyebrow icon, connected timeline, "View all" affordance

**Files:**
- Modify: `luxe-pms/src/app/(app)/dashboard/page.tsx` (Activity `Card` block ~line 532)

**Interfaces:**
- Consumes: existing `activity` array and `activityVisual()` / `ACTIVITY_CHIP` (unchanged).
- Produces: no interface change.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Add `History` and `ArrowRight` to the lucide-react import**

Find:

```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock, Radio,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

Replace with:

```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock, Radio, History, ArrowRight,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

- [ ] **Step 3: Rebuild the Activity card as a connected timeline**

Find (note the original file's pre-existing inconsistent indentation on this block — match it exactly):

```tsx
        {/* Activity */}
        <Card className="p-5 flex flex-col">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Activity</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Recent staff &amp; system events</p>
            </div>
            <ul className="-mx-2 flex-1 min-h-0 max-h-[440px] overflow-y-auto pr-1">
              {activity.map(a => {
                const v = activityVisual(`${a.verb} ${a.target}`, a.tone);
                const Icon = v.icon;
                const title = a.verb.charAt(0).toUpperCase() + a.verb.slice(1);
                const detail = a.target && a.target !== "—" ? ` · ${a.target}` : "";
                const who = a.actor && a.actor !== "System" ? `${a.actor} · ` : "";
                return (
                  <li key={a.id} className="flex items-start gap-3 px-2 py-2 rounded-md hover:bg-surface-sunken/50 transition-colors">
                    <span className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center", ACTIVITY_CHIP[v.accent])}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{title}</span>
                        <span className="text-muted-foreground">{detail}</span>
                      </p>
                      <p className="text-[11px] text-subtle-foreground mt-0.5">{who}{a.at}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
```

Replace with:

```tsx
        {/* Activity */}
        <Card className="p-6 flex flex-col">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand font-bold flex items-center gap-1.5">
              <History className="h-3 w-3" /> Activity
            </p>
            <h2 className="text-xl font-semibold mt-1 tracking-tight">Recent events</h2>
          </div>
          <ul className="relative -mx-2 flex-1 min-h-0 max-h-[440px] overflow-y-auto pr-1">
            <span className="absolute left-[26px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
            {activity.map(a => {
              const v = activityVisual(`${a.verb} ${a.target}`, a.tone);
              const Icon = v.icon;
              const title = a.verb.charAt(0).toUpperCase() + a.verb.slice(1);
              const detail = a.target && a.target !== "—" ? ` · ${a.target}` : "";
              const who = a.actor && a.actor !== "System" ? `${a.actor} · ` : "";
              return (
                <li key={a.id} className="relative flex items-start gap-3.5 px-2 py-2.5 rounded-lg hover:bg-surface-sunken/50 transition-colors">
                  <span className={cn("h-9 w-9 shrink-0 rounded-full flex items-center justify-center z-10", ACTIVITY_CHIP[v.accent])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{title}</span>
                      <span className="text-muted-foreground">{detail}</span>
                    </p>
                    <p className="text-[11px] text-subtle-foreground mt-0.5">{who}{a.at}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className="mt-3 text-xs font-semibold text-brand self-start flex items-center gap-1">
            View all activity <ArrowRight className="h-3 w-3" />
          </button>
        </Card>
```

- [ ] **Step 4: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors.

Run: `cd luxe-pms && npx eslint "src/app/(app)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 5: Restart dev server and visually verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard`. Confirm: the Activity card shows a bold gold eyebrow with a history icon; icon chips are circular avatars connected by a thin vertical line; hovering a row highlights its full rounded background; a "View all activity" text affordance sits below the list (no navigation required — it's a static button per spec).

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/app/(app)/dashboard/page.tsx"
git commit -m "style(dashboard): activity feed as connected timeline"
```

---

### Task 6: AI Daily Briefing card — glow background, per-bullet icons, pill "Ask AI" button

**Files:**
- Modify: `luxe-pms/src/app/(app)/dashboard/page.tsx` (`aiBriefing` memo ~line 216, AI Briefing `Card` block ~line 563)

**Interfaces:**
- Consumes: `stats`, `occPct`, `roomCounts`, `cur` (unchanged inputs to the memo).
- Produces: `aiBriefing` entries gain an `icon: typeof Percent` field (additive — `tone` and `text` fields unchanged, so nothing else that reads `aiBriefing` breaks).

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Add `Percent` and `TrendingUp` to the lucide-react import**

Find:

```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock, Radio, History, ArrowRight,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

Replace with:

```tsx
import {
  BedDouble, Sparkles, Wrench, Wallet, ChevronRight,
  AlertTriangle, Building2, LogIn, LogOut, LayoutGrid, CalendarRange,
  Bot, FileBarChart, Bell, Crown, CalendarPlus, BrushCleaning, Banknote,
  Activity as ActivityIcon, CheckCircle2, Clock, Radio, History, ArrowRight, Percent, TrendingUp,
  CreditCard, RefreshCw, Star, Trash2,
  Hotel, DoorOpen, PlaneLanding, PlaneTakeoff,
} from "lucide-react";
```

- [ ] **Step 3: Give each `aiBriefing` entry an `icon`**

Find:

```tsx
  // AI briefing distilled from the real numbers (no external model — just live facts).
  const aiBriefing = React.useMemo(() => {
    const out: { tone: "success" | "info" | "warning" | "danger"; text: React.ReactNode }[] = [];
    out.push({ tone: occPct >= 70 ? "success" : "info", text: <><span className="font-semibold">{occPct}%</span> occupancy today — {roomCounts.occupied} of {roomCounts.total} rooms sold.</> });
    const outstanding = stats?.revenue.outstanding ?? 0;
    if (outstanding > 0) out.push({ tone: "warning", text: <><span className="font-semibold">{money(outstanding, cur)}</span> outstanding across in-house folios.</> });
    const hk = roomCounts.dirty + roomCounts.cleaning;
    out.push(hk > 0
      ? { tone: "info", text: <><span className="font-semibold">{hk}</span> room{hk === 1 ? "" : "s"} awaiting housekeeping.</> }
      : { tone: "success", text: <>All rooms clean and inspection-ready.</> });
    const top = stats?.sourceMix?.[0];
    if (top) out.push({ tone: "info", text: <>Top source <span className="font-semibold">{top.source}</span> — {money(top.revenue, cur)} from {top.bookings} bookings.</> });
    return out.slice(0, 4);
  }, [stats, occPct, roomCounts, cur]);
```

Replace with:

```tsx
  // AI briefing distilled from the real numbers (no external model — just live facts).
  const aiBriefing = React.useMemo(() => {
    const out: { tone: "success" | "info" | "warning" | "danger"; icon: typeof Percent; text: React.ReactNode }[] = [];
    out.push({ tone: occPct >= 70 ? "success" : "info", icon: Percent, text: <><span className="font-semibold">{occPct}%</span> occupancy today — {roomCounts.occupied} of {roomCounts.total} rooms sold.</> });
    const outstanding = stats?.revenue.outstanding ?? 0;
    if (outstanding > 0) out.push({ tone: "warning", icon: Wallet, text: <><span className="font-semibold">{money(outstanding, cur)}</span> outstanding across in-house folios.</> });
    const hk = roomCounts.dirty + roomCounts.cleaning;
    out.push(hk > 0
      ? { tone: "info", icon: BrushCleaning, text: <><span className="font-semibold">{hk}</span> room{hk === 1 ? "" : "s"} awaiting housekeeping.</> }
      : { tone: "success", icon: CheckCircle2, text: <>All rooms clean and inspection-ready.</> });
    const top = stats?.sourceMix?.[0];
    if (top) out.push({ tone: "info", icon: TrendingUp, text: <>Top source <span className="font-semibold">{top.source}</span> — {money(top.revenue, cur)} from {top.bookings} bookings.</> });
    return out.slice(0, 4);
  }, [stats, occPct, roomCounts, cur]);
```

- [ ] **Step 4: Rebuild the AI Briefing card**

Find:

```tsx
          {/* AI Daily Briefing */}
          <Card className="p-5 flex flex-col relative overflow-hidden border-l-2 border-l-accent bg-linear-to-br from-accent-soft/15 via-surface to-surface">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="h-9 w-9 rounded-md bg-accent text-accent-foreground flex items-center justify-center shadow-xs">
                <Bot className="h-4.5 w-4.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">AI Daily Briefing</p>
                <p className="text-[11px] text-muted-foreground">Live insight stream · just now</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-info-soft text-info px-2 py-0.5 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" /> AI
              </span>
            </div>
            <ul className="space-y-2.5 text-[13px] flex-1">
              {aiBriefing.map((b, i) => (
                <li key={i} className="flex items-start gap-2 leading-snug">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                    b.tone === "success" && "bg-success",
                    b.tone === "info" && "bg-info",
                    b.tone === "warning" && "bg-warning",
                    b.tone === "danger" && "bg-danger",
                  )} />
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
                <CheckCircle2 className="h-3 w-3" /> Verified vs live PMS data
              </span>
              <Link href="/ai" className="text-xs text-brand hover:underline inline-flex items-center gap-0.5 font-medium">
                Ask AI <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
        </Card>
```

Replace with:

```tsx
          {/* AI Daily Briefing */}
          <Card className="p-6 flex flex-col relative overflow-hidden bg-linear-to-br from-accent-soft/35 via-surface to-surface">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <span className="h-10 w-10 rounded-xl bg-brand text-brand-foreground flex items-center justify-center shadow-md">
                <Bot className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">AI Daily Briefing</p>
                <p className="text-[11px] text-muted-foreground">Live insight stream · just now</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-info-soft text-info px-2.5 py-1 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" /> AI
              </span>
            </div>
            <ul className="space-y-2.5 text-[13px] flex-1 relative z-10">
              {aiBriefing.map((b, i) => {
                const Icon = b.icon;
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={cn(
                      "h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                      b.tone === "success" && "bg-success-soft text-success",
                      b.tone === "info" && "bg-info-soft text-info",
                      b.tone === "warning" && "bg-warning-soft text-warning",
                      b.tone === "danger" && "bg-danger-soft text-danger",
                    )}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="pt-0.5 leading-snug">{b.text}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between relative z-10">
              <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
                <CheckCircle2 className="h-3 w-3" /> Verified vs live PMS data
              </span>
              <Link href="/ai" className="text-xs font-bold text-brand-foreground bg-brand rounded-full px-3 py-1.5 flex items-center gap-1 hover:opacity-90 transition-opacity">
                Ask AI <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
        </Card>
```

- [ ] **Step 5: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no new errors.

Run: `cd luxe-pms && npx eslint "src/app/(app)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 6: Restart dev server and visually verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard`. Confirm: the AI Briefing card has a soft gold gradient background with a blurred glow in the top-right corner; the bot avatar is larger with a shadow; each of the up-to-4 bullet lines shows a small colored icon chip (percent/wallet/broom/trending-up icon, matching its meaning) instead of a plain dot; "Ask AI" is a solid gold pill button, not a text link. Also re-check Tasks 3–5's cards are still correct together in the full row (all four cards visually consistent).

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/dashboard/page.tsx"
git commit -m "style(dashboard): AI briefing glow card, per-bullet icons, pill CTA"
```
