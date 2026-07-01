# DashboardV2 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new, self-contained `/dashboard-v2` route — light-mode, purple/navy premium hotel-PMS dashboard — with its own sidebar/header, reusing every feature of the current dashboard but with an entirely new visual language, powered by typed mock data ready for a later API swap.

**Architecture:** All new files, nothing existing is modified. `luxe-pms/src/app/dashboard-v2/` (outside the `(app)` route group, so it does not inherit the existing dark-navy `AppShell`) holds `layout.tsx` (plain passthrough) and `page.tsx` (composes the row layout). `luxe-pms/src/components/dashboard-v2/` holds one file per card/section plus a shared `types.ts` (data shapes matching the real `/stats` API), `tokens.ts` (the 5-color tone palette), and `mock-data.ts` (one typed object the page renders directly — no fetching yet). Every component takes typed props only; none fetch data themselves.

**Tech Stack:** Next.js 16 (Turbopack), React client/server components, TypeScript, Tailwind v4 with literal arbitrary hex values (no new CSS variables), `lucide-react` icons.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-01-dashboard-v2-redesign-design.md`.
- Every file in this plan is **new**. Do not modify `luxe-pms/src/app/(app)/dashboard/page.tsx`, `AppShell`, `Sidebar`, `TopBar`, `globals.css`, or any other existing file.
- Colors are literal Tailwind arbitrary values (e.g. `bg-[#6D4AFF]`) per the spec's palette table — do not add new CSS custom properties or touch `globals.css`.
- No network calls — `page.tsx` imports `MOCK_DASHBOARD_V2_DATA` directly and passes it down as props. No `useState`/`useEffect`/`apiGet` for data.
- **Stop the dev server before creating files in a task**; after each task's files are created, run `rm -rf luxe-pms/.next/dev` and restart the dev server so new routes/files are picked up cleanly (the file watcher misses direct disk writes on the D: drive in this environment).
- Verification gate per task: `npx tsc --noEmit` and `npx eslint <changed files>` clean (no new errors). There is no component unit-test framework in this app — beyond type-check/lint, verification is a manual browser check of `/dashboard-v2`, plus confirming `/dashboard` still renders unchanged.
- Route mapping for the sidebar (from the spec, already confirmed with the user): `Dashboard→/dashboard-v2, Front Desk→/rack, Reservations→/bookings, Guests→/guests, Housekeeping→/housekeeping, Maintenance→/maintenance, Finance→/accounts, Reports→/reports, Rooms & Rates→/setup, Channel Manager→/channels, Staff→/staff, Settings→/setup`.

---

### Task 1: Data foundation — tone tokens, types, mock data

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/tokens.ts`
- Create: `luxe-pms/src/components/dashboard-v2/types.ts`
- Create: `luxe-pms/src/components/dashboard-v2/mock-data.ts`

**Interfaces:**
- Produces: `ToneV2` (`"purple" | "gold" | "green" | "blue" | "pink"`) and `TONE_STYLES: Record<ToneV2, { soft: string; text: string; solid: string; solidText: string }>` from `tokens.ts` — consumed by every card component in Tasks 4–7. `DashboardV2Data` and its sub-types from `types.ts` — consumed by `mock-data.ts` (this task) and every component's `Props` (Tasks 2–7). `MOCK_DASHBOARD_V2_DATA: DashboardV2Data` from `mock-data.ts` — consumed by `page.tsx` (Task 2 onward).

- [ ] **Step 1: Create `tokens.ts`**

```tsx
export type ToneV2 = "purple" | "gold" | "green" | "blue" | "pink";

export const TONE_STYLES: Record<ToneV2, { soft: string; text: string; solid: string; solidText: string }> = {
  purple: { soft: "bg-[#EEEAFF]", text: "text-[#6D4AFF]", solid: "bg-[#6D4AFF]", solidText: "text-white" },
  gold:   { soft: "bg-[#FDF3D6]", text: "text-[#B8860B]", solid: "bg-[#F5B800]", solidText: "text-[#101A33]" },
  green:  { soft: "bg-[#DCFCE7]", text: "text-[#16A34A]", solid: "bg-[#22C55E]", solidText: "text-white" },
  blue:   { soft: "bg-[#DBEAFE]", text: "text-[#2563EB]", solid: "bg-[#3B82F6]", solidText: "text-white" },
  pink:   { soft: "bg-[#FFE4E9]", text: "text-[#E11D48]", solid: "bg-[#F43F5E]", solidText: "text-white" },
};
```

- [ ] **Step 2: Create `types.ts`**

```tsx
import type { LucideIcon } from "lucide-react";
import type { ToneV2 } from "./tokens";

export type RoomStatusV2 = "available" | "occupied" | "reserved" | "out-of-order" | "blocked";

export interface RoomCellV2 {
  number: string;
  status: RoomStatusV2;
}

export interface FloorRowV2 {
  floor: string;
  rooms: RoomCellV2[];
}

export interface KpiV2 {
  id: string;
  label: string;
  value: number;
  badge?: string;
  caption: string;
  icon: LucideIcon;
  tone: ToneV2;
}

export interface QuickActionV2 {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  tone: ToneV2;
  badge?: number;
}

export interface PriorityItemV2 {
  id: string;
  icon: LucideIcon;
  tone: ToneV2;
  title: string;
  hint: string;
  count?: number;
}

export interface ArrivalDepartureRowV2 {
  id: string;
  guestName: string;
  tag?: string;
  meta: string;
  status?: "settled" | "balance";
  actionLabel: string;
}

export interface ActivityItemV2 {
  id: string;
  icon: LucideIcon;
  tone: ToneV2;
  title: string;
  actor: string;
  time: string;
}

export interface AiBriefingLineV2 {
  icon: LucideIcon;
  tone: ToneV2;
  text: string;
}

export interface DashboardV2Data {
  hotelName: string;
  hotelTagline: string;
  notificationCount: number;
  currentUser: { name: string; role: string; shift: string };
  occupancy: { pct: number; occupiedRooms: number; totalRooms: number; trendPct: number };
  kpis: KpiV2[];
  quickActions: QuickActionV2[];
  priorities: PriorityItemV2[];
  floors: FloorRowV2[];
  roomLegend: { status: RoomStatusV2; label: string }[];
  aiBriefing: AiBriefingLineV2[];
  arrivals: { summary: string; rows: ArrivalDepartureRowV2[] };
  departures: { summary: string; rows: ArrivalDepartureRowV2[] };
  activity: ActivityItemV2[];
}
```

- [ ] **Step 3: Create `mock-data.ts`**

```tsx
import {
  Wallet, LogOut, Sparkles, Wrench, DoorOpen, BedDouble, PlaneLanding, PlaneTakeoff,
  CalendarPlus, LogIn, LayoutGrid, CalendarRange, Banknote, FileBarChart, Bell,
  CheckCircle2, Percent, TrendingUp,
} from "lucide-react";
import type { DashboardV2Data } from "./types";

export const MOCK_DASHBOARD_V2_DATA: DashboardV2Data = {
  hotelName: "The Pearl Palace",
  hotelTagline: "Luxury Hotel & Resort",
  notificationCount: 3,
  currentUser: { name: "Khalid R.", role: "Reception", shift: "Shift #4218" },
  occupancy: { pct: 8, occupiedRooms: 1, totalRooms: 12, trendPct: 12 },
  kpis: [
    { id: "available", label: "Available Rooms", value: 9, badge: "75%", caption: "ready to sell", icon: DoorOpen, tone: "blue" },
    { id: "occupied", label: "Occupied Rooms", value: 1, badge: "8%", caption: "in-house now", icon: BedDouble, tone: "green" },
    { id: "arrivals", label: "Arrivals", value: 0, caption: "today expected", icon: PlaneLanding, tone: "gold" },
    { id: "departures", label: "Departures", value: 1, caption: "today checking out", icon: PlaneTakeoff, tone: "purple" },
    { id: "ooo", label: "Out of Order", value: 1, caption: "rooms under maintenance", icon: Wrench, tone: "pink" },
  ],
  quickActions: [
    { id: "new-booking", label: "New Booking", href: "/bookings/new", icon: CalendarPlus, tone: "purple" },
    { id: "checkin", label: "Check-in", href: "/checkin", icon: LogIn, tone: "blue" },
    { id: "checkout", label: "Checkout", href: "/checkout", icon: LogOut, tone: "green" },
    { id: "rack", label: "Room Rack", href: "/rack", icon: LayoutGrid, tone: "purple" },
    { id: "calendar", label: "Calendar", href: "/calendar", icon: CalendarRange, tone: "gold" },
    { id: "housekeeping", label: "Housekeeping", href: "/housekeeping", icon: Sparkles, tone: "green", badge: 2 },
    { id: "cashier", label: "Cashier", href: "/cashier", icon: Banknote, tone: "blue" },
    { id: "reports", label: "Reports", href: "/reports", icon: FileBarChart, tone: "pink" },
  ],
  priorities: [
    { id: "balance", icon: Wallet, tone: "pink", title: "Outstanding balance", hint: "₹8,96,025 to collect across folios" },
    { id: "checkouts", icon: LogOut, tone: "blue", title: "Checkouts due today", hint: "Settle the folio before checkout", count: 1 },
    { id: "clean", icon: Sparkles, tone: "gold", title: "Rooms to clean", hint: "Housekeeping sign-off pending", count: 1 },
    { id: "ooo", icon: Wrench, tone: "purple", title: "Rooms out of order", hint: "Maintenance in progress", count: 1 },
  ],
  floors: [
    { floor: "F6", rooms: [{ number: "601", status: "available" }] },
    { floor: "F5", rooms: [{ number: "501", status: "available" }] },
    { floor: "F4", rooms: [{ number: "401", status: "available" }, { number: "402", status: "blocked" }] },
    { floor: "F3", rooms: [{ number: "301", status: "available" }, { number: "302", status: "available" }] },
    { floor: "F2", rooms: [{ number: "201", status: "available" }, { number: "202", status: "available" }] },
    { floor: "F1", rooms: [{ number: "101", status: "occupied" }, { number: "102", status: "available" }, { number: "103", status: "available" }, { number: "104", status: "out-of-order" }] },
  ],
  roomLegend: [
    { status: "available", label: "Available" },
    { status: "occupied", label: "Occupied" },
    { status: "reserved", label: "Reserved" },
    { status: "out-of-order", label: "Out of Order" },
    { status: "blocked", label: "Blocked" },
  ],
  aiBriefing: [
    { icon: Percent, tone: "blue", text: "8% occupancy today — 1 of 12 rooms sold." },
    { icon: Wallet, tone: "gold", text: "₹8,96,025 outstanding across in-house folios." },
    { icon: Sparkles, tone: "blue", text: "1 room awaiting housekeeping." },
    { icon: TrendingUp, tone: "blue", text: "Top source Website — ₹6,08,500 from 32 bookings." },
  ],
  arrivals: {
    summary: "0 rooms · ₹0 to collect · 1 hall",
    rows: [
      { id: "hall-1", guestName: "Banquet A — Wedding", tag: "Hall", meta: "Francis · 18:00–23:00 · Non-Veg Premium", actionLabel: "Open" },
    ],
  },
  departures: {
    summary: "1 room checking out",
    rows: [
      { id: "dep-1", guestName: "Test E2E Guest", meta: "Room 201", status: "settled", actionLabel: "Checkout" },
    ],
  },
  activity: [
    { id: "a1", icon: Bell, tone: "blue", title: "Updated · #12", actor: "Hotel Admin", time: "4h ago" },
    { id: "a2", icon: CheckCircle2, tone: "green", title: "Created · OF-00102", actor: "Hotel Admin", time: "4h ago" },
    { id: "a3", icon: Bell, tone: "blue", title: "Updated · OF-00102", actor: "Hotel Admin", time: "4h ago" },
    { id: "a4", icon: Bell, tone: "blue", title: "Updated · #12", actor: "Hotel Admin", time: "4h ago" },
  ],
};
```

- [ ] **Step 4: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors (in particular, `MOCK_DASHBOARD_V2_DATA` must satisfy `DashboardV2Data` with no missing/extra fields).

Run: `cd luxe-pms && npx eslint "src/components/dashboard-v2/tokens.ts" "src/components/dashboard-v2/types.ts" "src/components/dashboard-v2/mock-data.ts"`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "luxe-pms/src/components/dashboard-v2/tokens.ts" "luxe-pms/src/components/dashboard-v2/types.ts" "luxe-pms/src/components/dashboard-v2/mock-data.ts"
git commit -m "feat(dashboard-v2): tone tokens, data types, and mock data"
```

---

### Task 2: Route scaffold + Sidebar

**Files:**
- Create: `luxe-pms/src/app/dashboard-v2/layout.tsx`
- Create: `luxe-pms/src/app/dashboard-v2/page.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/sidebar.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 yet (sidebar has no data props).
- Produces: `SidebarV2()` (no props) — rendered directly in `page.tsx`, stays as-is through the rest of the plan. `page.tsx` default export — every later task edits this file's `<main>` content only.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Create the isolated layout**

```tsx
export default function DashboardV2Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 3: Create `sidebar.tsx`**

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, DoorOpen, CalendarRange, Users, Sparkles, Wrench,
  Wallet, FileBarChart, SlidersHorizontal, Globe, UserCog, Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_V2: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard-v2", icon: LayoutDashboard },
  { label: "Front Desk", href: "/rack", icon: DoorOpen },
  { label: "Reservations", href: "/bookings", icon: CalendarRange },
  { label: "Guests", href: "/guests", icon: Users },
  { label: "Housekeeping", href: "/housekeeping", icon: Sparkles },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Finance", href: "/accounts", icon: Wallet },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Rooms & Rates", href: "/setup", icon: SlidersHorizontal },
  { label: "Channel Manager", href: "/channels", icon: Globe },
  { label: "Staff", href: "/staff", icon: UserCog },
  { label: "Settings", href: "/setup", icon: Settings },
];

export function SidebarV2() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#101A33] text-white">
      <div className="h-20 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
        <span className="h-10 w-10 rounded-lg bg-[#F5B800] text-[#101A33] flex items-center justify-center font-bold text-sm shrink-0">
          PP
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">The Pearl Palace</p>
          <p className="text-[11px] text-white/50 truncate">Luxury Hotel &amp; Resort</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_V2.map(item => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[#6D4AFF] text-white font-semibold shadow-md shadow-[#6D4AFF]/30"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="rounded-lg bg-white/5 p-3 text-xs text-white/60">
          <p className="font-medium text-white/80">Quick Support</p>
          <p className="mt-0.5">We are online 24/7</p>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create `page.tsx` with the sidebar and a placeholder content area**

```tsx
import { SidebarV2 } from "@/components/dashboard-v2/sidebar";

export default function DashboardV2Page() {
  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <p className="text-sm text-[#6B7280]">DashboardV2 — content coming soon.</p>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/app/dashboard-v2/layout.tsx" "src/app/dashboard-v2/page.tsx" "src/components/dashboard-v2/sidebar.tsx"`
Expected: clean.

- [ ] **Step 6: Restart dev server and verify isolation**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server per the project's normal start script.
Open `/dashboard-v2`. Confirm: a single purple/navy sidebar renders on the left (no old dark AppShell sidebar behind or around it), "Dashboard" shows as active (purple pill), all 12 nav items are visible and clickable, clicking "Guests" navigates to `/guests` (which renders inside the OLD AppShell — expected, only `/dashboard-v2` itself is redesigned). Then open `/dashboard` in a separate tab — confirm it is completely unchanged (still dark navy theme).

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/dashboard-v2/layout.tsx" "luxe-pms/src/app/dashboard-v2/page.tsx" "luxe-pms/src/components/dashboard-v2/sidebar.tsx"
git commit -m "feat(dashboard-v2): route scaffold and sidebar"
```

---

### Task 3: Top header

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/top-header.tsx`
- Modify: `luxe-pms/src/app/dashboard-v2/page.tsx`

**Interfaces:**
- Consumes: `MOCK_DASHBOARD_V2_DATA.notificationCount` and `.currentUser` (Task 1).
- Produces: `TopHeaderV2({ notificationCount, currentUser })` — rendered once, above `<main>`, for the rest of the plan.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Create `top-header.tsx`**

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { Search, Plus, Bell } from "lucide-react";

interface Props {
  notificationCount: number;
  currentUser: { name: string; role: string; shift: string };
}

export function TopHeaderV2({ notificationCount, currentUser }: Props) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const timeLabel = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "--:--";
  const dateLabel = now ? now.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric", weekday: "long" }) : "";

  return (
    <header className="sticky top-0 z-20 h-20 flex items-center gap-4 bg-white px-6 shadow-[0_1px_0_0_#E5E7EB,0_4px_12px_-4px_rgb(0_0_0_/_0.06)]">
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 rounded-xl bg-[#F7F8FC] px-3.5 py-2.5 text-sm text-[#6B7280]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search by guest, booking, room...</span>
          <kbd className="text-[10px] font-semibold text-[#6B7280]/70 border border-[#E5E7EB] rounded px-1.5 py-0.5">⌘K</kbd>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-1.5 text-sm text-[#111827] pr-2">
        <span className="font-semibold tabular-nums">{timeLabel}</span>
        <span className="text-[#6B7280]">·</span>
        <span className="text-[#6B7280]">{dateLabel}</span>
      </div>
      <Link
        href="/bookings/new"
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#6D4AFF] text-white text-sm font-semibold px-4 py-2.5 shadow-md shadow-[#6D4AFF]/25 hover:bg-[#5d3ce6] transition-colors shrink-0"
      >
        <Plus className="h-4 w-4" /> New Booking
      </Link>
      <button type="button" className="relative h-10 w-10 rounded-xl bg-[#F7F8FC] flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-colors shrink-0" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </button>
      <div className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB] shrink-0">
        <span className="h-10 w-10 rounded-full bg-[#EEEAFF] text-[#6D4AFF] flex items-center justify-center text-sm font-bold">
          {currentUser.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
        </span>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-semibold text-[#111827]">{currentUser.name}</p>
          <p className="text-[11px] text-[#6B7280]">{currentUser.role} · {currentUser.shift}</p>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Wire the header into `page.tsx`**

Find:

```tsx
import { SidebarV2 } from "@/components/dashboard-v2/sidebar";

export default function DashboardV2Page() {
  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <p className="text-sm text-[#6B7280]">DashboardV2 — content coming soon.</p>
        </main>
      </div>
    </div>
  );
}
```

Replace with:

```tsx
import { SidebarV2 } from "@/components/dashboard-v2/sidebar";
import { TopHeaderV2 } from "@/components/dashboard-v2/top-header";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";

export default function DashboardV2Page() {
  const data = MOCK_DASHBOARD_V2_DATA;

  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <TopHeaderV2 notificationCount={data.notificationCount} currentUser={data.currentUser} />
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <p className="text-sm text-[#6B7280]">DashboardV2 — content coming soon.</p>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/components/dashboard-v2/top-header.tsx" "src/app/dashboard-v2/page.tsx"`
Expected: clean.

- [ ] **Step 5: Restart dev server and verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard-v2`. Confirm: header shows the search bar, a live-updating clock/date, a purple "New Booking" button, a bell icon with a red "3" badge, and "Khalid R. / Reception · Shift #4218" with a purple initials avatar. No hydration-mismatch warnings in the browser console (the clock must start blank/`--:--` on server render and fill in after mount).

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/components/dashboard-v2/top-header.tsx" "luxe-pms/src/app/dashboard-v2/page.tsx"
git commit -m "feat(dashboard-v2): top header with search, clock, and user"
```

---

### Task 4: Row 1 — Occupancy hero + KPI cards

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/occupancy-hero.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/kpi-card.tsx`
- Modify: `luxe-pms/src/app/dashboard-v2/page.tsx`

**Interfaces:**
- Consumes: `TONE_STYLES` (Task 1), `MOCK_DASHBOARD_V2_DATA.occupancy` and `.kpis` (Task 1).
- Produces: `OccupancyHeroV2({ pct, occupiedRooms, totalRooms, trendPct })` and `KpiCardV2({ label, value, badge?, caption, icon, tone })` — both rendered inside `page.tsx`'s Row 1 `<section>` from here on.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Create `occupancy-hero.tsx`**

```tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Props {
  pct: number;
  occupiedRooms: number;
  totalRooms: number;
  trendPct: number;
}

export function OccupancyHeroV2({ pct, occupiedRooms, totalRooms, trendPct }: Props) {
  const radius = 70;
  const thickness = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const size = (radius + thickness) * 2;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101A33] to-[#1E2A4A] p-6 text-white shadow-lg lg:col-span-2 flex items-center gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] text-white/60 font-semibold">Occupancy Today</p>
        <p className="text-5xl font-bold tracking-tight mt-2">{pct}%</p>
        <p className="text-sm text-white/70 mt-2">{occupiedRooms} of {totalRooms} rooms occupied</p>
        <p className="text-xs text-[#22C55E] font-semibold mt-3 inline-flex items-center gap-1">
          <ArrowUpRight className="h-3.5 w-3.5" /> {trendPct}% vs yesterday
        </p>
        <Link
          href="/reports"
          className="mt-5 inline-flex items-center rounded-lg border border-white/20 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
        >
          View detailed report
        </Link>
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 hidden sm:block">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#F5B800" strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 3: Create `kpi-card.tsx`**

```tsx
import type { LucideIcon } from "lucide-react";
import { TONE_STYLES, type ToneV2 } from "./tokens";

interface Props {
  label: string;
  value: number;
  badge?: string;
  caption: string;
  icon: LucideIcon;
  tone: ToneV2;
}

export function KpiCardV2({ label, value, badge, caption, icon: Icon, tone }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#6B7280]">{label}</p>
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight text-[#111827]">{value}</p>
        {badge && (
          <span className={`text-[11px] font-bold rounded-md px-1.5 py-0.5 ${s.soft} ${s.text}`}>{badge}</span>
        )}
      </div>
      <p className="text-[11px] text-[#6B7280] mt-2">{caption}</p>
    </div>
  );
}
```

- [ ] **Step 4: Wire Row 1 into `page.tsx`**

Find:

```tsx
import { SidebarV2 } from "@/components/dashboard-v2/sidebar";
import { TopHeaderV2 } from "@/components/dashboard-v2/top-header";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";

export default function DashboardV2Page() {
  const data = MOCK_DASHBOARD_V2_DATA;

  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <TopHeaderV2 notificationCount={data.notificationCount} currentUser={data.currentUser} />
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <p className="text-sm text-[#6B7280]">DashboardV2 — content coming soon.</p>
        </main>
      </div>
    </div>
  );
}
```

Replace with:

```tsx
import { SidebarV2 } from "@/components/dashboard-v2/sidebar";
import { TopHeaderV2 } from "@/components/dashboard-v2/top-header";
import { OccupancyHeroV2 } from "@/components/dashboard-v2/occupancy-hero";
import { KpiCardV2 } from "@/components/dashboard-v2/kpi-card";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";

export default function DashboardV2Page() {
  const data = MOCK_DASHBOARD_V2_DATA;

  return (
    <div className="min-h-svh bg-[#F7F8FC]">
      <SidebarV2 />
      <div className="lg:pl-64">
        <TopHeaderV2 notificationCount={data.notificationCount} currentUser={data.currentUser} />
        <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-5">
            <OccupancyHeroV2
              pct={data.occupancy.pct}
              occupiedRooms={data.occupancy.occupiedRooms}
              totalRooms={data.occupancy.totalRooms}
              trendPct={data.occupancy.trendPct}
            />
            {data.kpis.map(kpi => (
              <KpiCardV2 key={kpi.id} {...kpi} />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/components/dashboard-v2/occupancy-hero.tsx" "src/components/dashboard-v2/kpi-card.tsx" "src/app/dashboard-v2/page.tsx"`
Expected: clean.

- [ ] **Step 6: Restart dev server and verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard-v2`. Confirm: a large dark navy occupancy card on the left with an "8%" figure and a gold progress ring, followed by 5 white KPI tiles (Available/Occupied/Arrivals/Departures/Out of Order) each with a colored icon chip. Resize to a narrower window — the row wraps to 2 then 1 column without overlap.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/components/dashboard-v2/occupancy-hero.tsx" "luxe-pms/src/components/dashboard-v2/kpi-card.tsx" "luxe-pms/src/app/dashboard-v2/page.tsx"
git commit -m "feat(dashboard-v2): occupancy hero and KPI row"
```

---

### Task 5: Row 2 — Quick action tiles

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/quick-action-tile.tsx`
- Modify: `luxe-pms/src/app/dashboard-v2/page.tsx`

**Interfaces:**
- Consumes: `TONE_STYLES` (Task 1), `MOCK_DASHBOARD_V2_DATA.quickActions` (Task 1).
- Produces: `QuickActionTileV2({ label, href, icon, tone, badge? })`.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Create `quick-action-tile.tsx`**

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
      className="relative rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)] hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col items-center text-center gap-2.5"
    >
      <span className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.soft} ${s.text}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-[#111827]">{label}</p>
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute top-3 right-3 h-5 min-w-[20px] px-1 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Wire Row 2 into `page.tsx`**

Find:

```tsx
import { OccupancyHeroV2 } from "@/components/dashboard-v2/occupancy-hero";
import { KpiCardV2 } from "@/components/dashboard-v2/kpi-card";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";
```

Replace with:

```tsx
import { OccupancyHeroV2 } from "@/components/dashboard-v2/occupancy-hero";
import { KpiCardV2 } from "@/components/dashboard-v2/kpi-card";
import { QuickActionTileV2 } from "@/components/dashboard-v2/quick-action-tile";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";
```

Find:

```tsx
            {data.kpis.map(kpi => (
              <KpiCardV2 key={kpi.id} {...kpi} />
            ))}
          </section>
        </main>
```

Replace with:

```tsx
            {data.kpis.map(kpi => (
              <KpiCardV2 key={kpi.id} {...kpi} />
            ))}
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {data.quickActions.map(action => (
              <QuickActionTileV2 key={action.id} {...action} />
            ))}
          </section>
        </main>
```

- [ ] **Step 4: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/components/dashboard-v2/quick-action-tile.tsx" "src/app/dashboard-v2/page.tsx"`
Expected: clean.

- [ ] **Step 5: Restart dev server and verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard-v2`. Confirm: 8 quick-action tiles in one row on desktop (New Booking, Check-in, Checkout, Room Rack, Calendar, Housekeeping, Cashier, Reports), each with a large soft-colored icon; the Housekeeping tile shows a small red "2" badge; hovering a tile lifts it slightly with a stronger shadow; clicking "New Booking" navigates to `/bookings/new`.

- [ ] **Step 6: Commit**

```bash
git add "luxe-pms/src/components/dashboard-v2/quick-action-tile.tsx" "luxe-pms/src/app/dashboard-v2/page.tsx"
git commit -m "feat(dashboard-v2): quick action tiles row"
```

---

### Task 6: Row 3 — Priorities, Live Room Status, AI Briefing

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/priorities-list.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/room-status-grid.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/ai-briefing-card.tsx`
- Modify: `luxe-pms/src/app/dashboard-v2/page.tsx`

**Interfaces:**
- Consumes: `TONE_STYLES` (Task 1), `MOCK_DASHBOARD_V2_DATA.priorities`, `.floors`, `.roomLegend`, `.aiBriefing` (Task 1).
- Produces: `PrioritiesListV2({ items })`, `RoomStatusGridV2({ floors, legend })`, `AiBriefingCardV2({ lines })`.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Create `priorities-list.tsx`**

```tsx
import type { PriorityItemV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  items: PriorityItemV2[];
}

export function PrioritiesListV2({ items }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.08em]">Today&apos;s Priorities</p>
        <span className="text-[11px] font-bold rounded-full bg-[#F7F8FC] text-[#6B7280] px-2.5 py-1">{items.length} Items</span>
      </div>
      <ul className="space-y-1">
        {items.map(item => {
          const s = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F7F8FC] transition-colors cursor-pointer">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                  {typeof item.count === "number" && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${s.soft} ${s.text}`}>{item.count}</span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5 truncate">{item.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Create `room-status-grid.tsx`**

```tsx
import type { FloorRowV2, RoomStatusV2 } from "./types";

const STATUS_STYLE: Record<RoomStatusV2, string> = {
  available: "bg-[#22C55E] text-white",
  occupied: "bg-[#F5B800] text-[#101A33]",
  reserved: "bg-[#3B82F6] text-white",
  "out-of-order": "bg-[#F43F5E] text-white",
  blocked: "bg-[#E5E7EB] text-[#6B7280]",
};

const LEGEND_DOT: Record<RoomStatusV2, string> = {
  available: "bg-[#22C55E]",
  occupied: "bg-[#F5B800]",
  reserved: "bg-[#3B82F6]",
  "out-of-order": "bg-[#F43F5E]",
  blocked: "bg-[#E5E7EB]",
};

interface Props {
  floors: FloorRowV2[];
  legend: { status: RoomStatusV2; label: string }[];
}

export function RoomStatusGridV2({ floors, legend }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.08em]">Live Room Status</p>
        <span className="text-[11px] font-medium text-[#6B7280] border border-[#E5E7EB] rounded-lg px-2.5 py-1">All Floors</span>
      </div>
      <div className="space-y-2">
        {floors.map(row => (
          <div key={row.floor} className="flex items-center gap-2.5">
            <span className="w-7 text-[11px] font-bold text-[#6B7280] shrink-0">{row.floor}</span>
            <div className="flex flex-wrap gap-1.5">
              {row.rooms.map(room => (
                <span
                  key={room.number}
                  className={`h-8 min-w-[44px] px-1 rounded-lg flex items-center justify-center text-[11px] font-bold ${STATUS_STYLE[room.status]}`}
                >
                  {room.number}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#6B7280]">
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

- [ ] **Step 4: Create `ai-briefing-card.tsx`**

```tsx
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { AiBriefingLineV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  lines: AiBriefingLineV2[];
}

export function AiBriefingCardV2({ lines }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#101A33] to-[#1E2A4A] p-5 text-white shadow-lg flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="h-9 w-9 rounded-xl bg-[#F5B800] text-[#101A33] flex items-center justify-center shrink-0">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <p className="text-sm font-bold flex-1">AI Daily Briefing</p>
        <span className="text-[10px] font-bold rounded-full bg-white/10 px-2 py-1">AI</span>
      </div>
      <ul className="space-y-2.5 text-[13px] flex-1">
        {lines.map((line, i) => {
          const s = TONE_STYLES[line.tone];
          const Icon = line.icon;
          return (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${s.soft} ${s.text}`}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="pt-0.5 leading-snug text-white/90">{line.text}</span>
            </li>
          );
        })}
      </ul>
      <Link
        href="/ai"
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F5B800] text-[#101A33] text-xs font-bold px-4 py-2.5 hover:brightness-95 transition-[filter]"
      >
        View full analysis <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Wire Row 3 into `page.tsx`**

Find:

```tsx
import { QuickActionTileV2 } from "@/components/dashboard-v2/quick-action-tile";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";
```

Replace with:

```tsx
import { QuickActionTileV2 } from "@/components/dashboard-v2/quick-action-tile";
import { PrioritiesListV2 } from "@/components/dashboard-v2/priorities-list";
import { RoomStatusGridV2 } from "@/components/dashboard-v2/room-status-grid";
import { AiBriefingCardV2 } from "@/components/dashboard-v2/ai-briefing-card";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";
```

Find:

```tsx
            {data.quickActions.map(action => (
              <QuickActionTileV2 key={action.id} {...action} />
            ))}
          </section>
        </main>
```

Replace with:

```tsx
            {data.quickActions.map(action => (
              <QuickActionTileV2 key={action.id} {...action} />
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <PrioritiesListV2 items={data.priorities} />
            <RoomStatusGridV2 floors={data.floors} legend={data.roomLegend} />
            <AiBriefingCardV2 lines={data.aiBriefing} />
          </section>
        </main>
```

- [ ] **Step 6: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/components/dashboard-v2/priorities-list.tsx" "src/components/dashboard-v2/room-status-grid.tsx" "src/components/dashboard-v2/ai-briefing-card.tsx" "src/app/dashboard-v2/page.tsx"`
Expected: clean.

- [ ] **Step 7: Restart dev server and verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard-v2`. Confirm: "Today's Priorities" shows 4 actionable rows with colored icon chips and a "4 Items" pill; "Live Room Status" shows 6 floor rows (F6 down to F1) with colored room-number chips (green/gold/pink/grey) and a 5-item legend below; "AI Daily Briefing" is a dark navy card with 4 bullet lines each with a small icon, and a gold "View full analysis" button linking to `/ai`.

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/components/dashboard-v2/priorities-list.tsx" "luxe-pms/src/components/dashboard-v2/room-status-grid.tsx" "luxe-pms/src/components/dashboard-v2/ai-briefing-card.tsx" "luxe-pms/src/app/dashboard-v2/page.tsx"
git commit -m "feat(dashboard-v2): priorities, live room status, AI briefing row"
```

---

### Task 7: Row 4 — Arrivals, Departures, Recent Activity

**Files:**
- Create: `luxe-pms/src/components/dashboard-v2/arrival-departure-card.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/arrivals-card.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/departures-card.tsx`
- Create: `luxe-pms/src/components/dashboard-v2/activity-feed.tsx`
- Modify: `luxe-pms/src/app/dashboard-v2/page.tsx`

**Interfaces:**
- Consumes: `TONE_STYLES` (Task 1), `ArrivalDepartureRowV2` / `ActivityItemV2` types (Task 1), `MOCK_DASHBOARD_V2_DATA.arrivals`, `.departures`, `.activity` (Task 1).
- Produces: `ArrivalDepartureCardV2({ title, icon, summary, rows, viewAllHref, emptyLabel })` (shared, internal to this task), `ArrivalsCardV2({ summary, rows })`, `DeparturesCardV2({ summary, rows })`, `ActivityFeedV2({ items })`.

- [ ] **Step 1: Stop the dev server**

- [ ] **Step 2: Create the shared `arrival-departure-card.tsx`**

```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ArrivalDepartureRowV2 } from "./types";

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
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-xl bg-[#EEEAFF] text-[#6D4AFF] flex items-center justify-center shrink-0">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.06em]">{title}</p>
        </div>
        <Link href={viewAllHref} className="text-xs font-semibold text-[#6D4AFF] hover:underline">View all</Link>
      </div>
      <p className="text-xs text-[#6B7280] mb-3 pl-[46px]">{summary}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280] text-center py-6">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.id} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] px-3 py-2.5">
              <span className="h-9 w-9 rounded-full bg-[#F5B800] text-[#101A33] flex items-center justify-center text-xs font-bold shrink-0">
                {row.guestName.split(" ").map(p => p[0]).slice(0, 2).join("")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#111827] truncate">{row.guestName}</p>
                  {row.tag && <span className="text-[10px] font-bold rounded-full bg-[#EEEAFF] text-[#6D4AFF] px-2 py-0.5 shrink-0">{row.tag}</span>}
                </div>
                <p className="text-xs text-[#6B7280] truncate mt-0.5">{row.meta}</p>
              </div>
              {row.status === "settled" && (
                <span className="text-[11px] font-semibold text-[#16A34A] shrink-0">Settled</span>
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

- [ ] **Step 3: Create `arrivals-card.tsx` and `departures-card.tsx`**

`luxe-pms/src/components/dashboard-v2/arrivals-card.tsx`:

```tsx
import { PlaneLanding } from "lucide-react";
import { ArrivalDepartureCardV2 } from "./arrival-departure-card";
import type { ArrivalDepartureRowV2 } from "./types";

interface Props {
  summary: string;
  rows: ArrivalDepartureRowV2[];
}

export function ArrivalsCardV2({ summary, rows }: Props) {
  return (
    <ArrivalDepartureCardV2
      title="Today's Arrivals"
      icon={PlaneLanding}
      summary={summary}
      rows={rows}
      viewAllHref="/checkin"
      emptyLabel="No arrivals scheduled today."
    />
  );
}
```

`luxe-pms/src/components/dashboard-v2/departures-card.tsx`:

```tsx
import { PlaneTakeoff } from "lucide-react";
import { ArrivalDepartureCardV2 } from "./arrival-departure-card";
import type { ArrivalDepartureRowV2 } from "./types";

interface Props {
  summary: string;
  rows: ArrivalDepartureRowV2[];
}

export function DeparturesCardV2({ summary, rows }: Props) {
  return (
    <ArrivalDepartureCardV2
      title="Today's Departures"
      icon={PlaneTakeoff}
      summary={summary}
      rows={rows}
      viewAllHref="/checkout"
      emptyLabel="No departures due today."
    />
  );
}
```

- [ ] **Step 4: Create `activity-feed.tsx`**

```tsx
import type { ActivityItemV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  items: ActivityItemV2[];
}

export function ActivityFeedV2({ items }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.08em]">Recent Activity</p>
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
                <p className="text-sm font-medium text-[#111827] truncate">{item.title}</p>
                <p className="text-[11px] text-[#6B7280] truncate">{item.actor} · {item.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Wire Row 4 into `page.tsx`**

Find:

```tsx
import { AiBriefingCardV2 } from "@/components/dashboard-v2/ai-briefing-card";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";
```

Replace with:

```tsx
import { AiBriefingCardV2 } from "@/components/dashboard-v2/ai-briefing-card";
import { ArrivalsCardV2 } from "@/components/dashboard-v2/arrivals-card";
import { DeparturesCardV2 } from "@/components/dashboard-v2/departures-card";
import { ActivityFeedV2 } from "@/components/dashboard-v2/activity-feed";
import { MOCK_DASHBOARD_V2_DATA } from "@/components/dashboard-v2/mock-data";
```

Find:

```tsx
            <AiBriefingCardV2 lines={data.aiBriefing} />
          </section>
        </main>
```

Replace with:

```tsx
            <AiBriefingCardV2 lines={data.aiBriefing} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <ArrivalsCardV2 summary={data.arrivals.summary} rows={data.arrivals.rows} />
            <DeparturesCardV2 summary={data.departures.summary} rows={data.departures.rows} />
            <ActivityFeedV2 items={data.activity} />
          </section>
        </main>
```

- [ ] **Step 6: Type-check and lint**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/components/dashboard-v2/arrival-departure-card.tsx" "src/components/dashboard-v2/arrivals-card.tsx" "src/components/dashboard-v2/departures-card.tsx" "src/components/dashboard-v2/activity-feed.tsx" "src/app/dashboard-v2/page.tsx"`
Expected: clean.

- [ ] **Step 7: Restart dev server and verify**

Run: `rm -rf luxe-pms/.next/dev` then start the dev server.
Open `/dashboard-v2`. Confirm: "Today's Arrivals" shows the mock hall booking row with an "Open" button; "Today's Departures" shows the mock guest row with "Settled" + a "Checkout" button; "Recent Activity" shows a 2-column grid of 4 events with colored icon chips. The full page now matches all four rows from the spec end-to-end.

- [ ] **Step 8: Commit**

```bash
git add "luxe-pms/src/components/dashboard-v2/arrival-departure-card.tsx" "luxe-pms/src/components/dashboard-v2/arrivals-card.tsx" "luxe-pms/src/components/dashboard-v2/departures-card.tsx" "luxe-pms/src/components/dashboard-v2/activity-feed.tsx" "luxe-pms/src/app/dashboard-v2/page.tsx"
git commit -m "feat(dashboard-v2): arrivals, departures, and activity row"
```

---

### Task 8: Final responsive + full-page verification

**Files:**
- None (verification only — no code changes expected; if this step surfaces a real overlap/regression, fix it in the specific component file responsible and note which one).

**Interfaces:**
- Consumes: the fully composed `page.tsx` from Task 7.
- Produces: nothing new — this task is a gate, not a feature.

- [ ] **Step 1: Type-check and lint the whole `dashboard-v2` tree one more time**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors.

Run: `cd luxe-pms && npx eslint "src/app/dashboard-v2" "src/components/dashboard-v2"`
Expected: clean.

- [ ] **Step 2: Full-page desktop verification**

Open `/dashboard-v2` at a desktop width (≥1280px). Walk the spec's Verification section top to bottom: sidebar (all 12 items, active state on Dashboard), header (search/clock/New Booking/bell badge/user), Row 1 (hero + 5 KPIs), Row 2 (8 quick actions), Row 3 (priorities/room grid/AI briefing), Row 4 (arrivals/departures/activity). Confirm no console errors or React hydration warnings.

- [ ] **Step 3: Tablet-width verification**

Resize the browser (or use devtools responsive mode) to ~768–1024px. Confirm: KPI row wraps to 2 columns, quick actions wrap to 4 per row, Row 3 and Row 4 cards stack to 1–2 columns, nothing overlaps or overflows horizontally. The sidebar hides below the `lg` breakpoint (documented, expected per spec — mobile/narrow-tablet is not a primary target) — confirm content isn't clipped by the (now-hidden) sidebar's absence, i.e. there's no leftover `lg:pl-64` gap on narrow widths.

- [ ] **Step 4: Confirm zero impact on the existing app**

Open `/dashboard` — confirm it is pixel-identical to before this plan started (dark navy theme, existing cards). Open `/rack`, `/bookings`, `/guests` from the DashboardV2 sidebar links — confirm each still renders inside the original `AppShell` exactly as before (this plan didn't touch those pages, this is a smoke check that nothing regressed).

- [ ] **Step 5: Commit (only if Step 2 or 3 required a fix)**

If no fixes were needed, skip this step — Task 7's commit is the final state. If a fix was needed:

```bash
git add <fixed file(s)>
git commit -m "fix(dashboard-v2): responsive/visual fix from final verification pass"
```
