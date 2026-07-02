# Hall Booking Table/Card View Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Table/Cards view toggle to the Hall Booking list so staff can switch between the existing dense table and a responsive card grid, without changing any filtering, KPI, or dialog behavior.

**Architecture:** Single-file change to `luxe-pms/src/app/(app)/halls/page.tsx`. Add a `view: "table" | "cards"` state (default `"table"`) and a segmented toggle button in the existing filter bar, mirroring the pattern already used on the Vendors page. Wrap the existing `<table>` markup in a `view === "table"` conditional, and add a new `view === "cards"` branch that maps over the same `list` array into a responsive `Card` grid, reusing the exact same event handlers (`setSelected`, `setModifyTarget`, `setCancelTarget`, `setActionMenuFor`/`setMenuRect`) as the table rows — no new state, no new business logic.

**Tech Stack:** Next.js (App Router) + React (client component) + TypeScript + Tailwind CSS + lucide-react icons. No test runner covers this file (Vitest in this repo only covers pure functions under `src/lib/**`, with a `node` environment and no React Testing Library/jsdom) — verification is `tsc --noEmit`, `npm run lint`, and manual browser verification.

## Global Constraints

- This is a customized Next.js build with breaking changes from stock Next.js — per `luxe-pms/AGENTS.md`, check `node_modules/next/dist/docs/` before using any Next.js API you're unsure about. (Not expected to matter here — no new Next.js APIs are used.)
- Follow the existing codebase pattern for view toggles exactly (Vendors page `cards`/`list` toggle) rather than inventing a new UI convention.
- No persistence of the view choice — session-only `React.useState`, matching Vendors.
- No changes to filtering, KPI bar, status chips, sorting, or any dialog/drawer (Modify, Cancel, Receive payment, Detail drawer).

---

### Task 1: Add view toggle + card grid to Hall Booking list

**Files:**
- Modify: `luxe-pms/src/app/(app)/halls/page.tsx`

**Interfaces:**
- Consumes: existing `list` (filtered `HallBooking[]`), `overrides`, `actionMenuFor`, `menuRect`, `STATUS_TONE`, `money()`, `formatDate()`, `cn()` from `@/lib/utils`, and existing handlers `setSelected`, `setModifyTarget`, `setCancelTarget`, `setActionMenuFor`, `setMenuRect` — all already defined earlier in this component (lines 45–171 of the current file). No changes to any of their signatures.
- Produces: new local state `view: "table" | "cards"` / `setView`, used only within this file.

- [ ] **Step 1: Add `LayoutGrid` and `List` icon imports**

In `luxe-pms/src/app/(app)/halls/page.tsx`, the top import block currently reads:

```tsx
import {
  Plus, Search, Calendar, Users, Clock, Building2,
  Eye, Edit, Ban, MoreHorizontal, X, CheckCircle2, AlertTriangle,
  Phone, Mail, MessageCircle, IndianRupee, Printer, FileText, Sparkles,
  Wallet,
} from "lucide-react";
```

Change the last line of icon names to:

```tsx
  Wallet, LayoutGrid, List,
} from "lucide-react";
```

- [ ] **Step 2: Add `view` state**

Find this block (currently around line 49–52):

```tsx
  const [actionMenuFor, setActionMenuFor] = React.useState<string | null>(null);
  // Anchor rect of the open trigger — the menu is portalled to <body> so the
  // table's overflow doesn't clip it.
  const [menuRect, setMenuRect] = React.useState<DOMRect | null>(null);
```

Add a new line directly after it:

```tsx
  const [actionMenuFor, setActionMenuFor] = React.useState<string | null>(null);
  // Anchor rect of the open trigger — the menu is portalled to <body> so the
  // table's overflow doesn't clip it.
  const [menuRect, setMenuRect] = React.useState<DOMRect | null>(null);
  const [view, setView] = React.useState<"table" | "cards">("table");
```

- [ ] **Step 3: Add the Table/Cards toggle to the filter bar**

Find this block (the end of the filter `Card`, currently around lines 238–246):

```tsx
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setHallFilter("all"); setStatusFilter("all"); }}>
              Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">{list.length} of {effective.length}</p>
        </div>
      </Card>
```

Replace it with:

```tsx
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setHallFilter("all"); setStatusFilter("all"); }}>
              Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium border-r border-border transition-colors",
                view === "table" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "h-full px-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
                view === "cards" ? "bg-brand text-brand-foreground" : "hover:bg-surface-sunken text-muted-foreground"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground tabular">{list.length} of {effective.length}</p>
        </div>
      </Card>
```

- [ ] **Step 4: Wrap the existing table in a `view === "table"` conditional**

Find the table's opening (currently around lines 248–250):

```tsx
      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
```

Replace with:

```tsx
      {/* Table */}
      {view === "table" && (
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
```

Find the table's closing, immediately followed by the row-actions-menu portal comment (currently around lines 361–365):

```tsx
        </div>
      </Card>

      {/* Row actions menu — portalled to <body> so the table's overflow never
          clips it; positioned from the trigger rect, flipping up near the bottom. */}
```

Replace with:

```tsx
        </div>
      </Card>
      )}

      {/* Row actions menu — portalled to <body> so the table's overflow never
          clips it; positioned from the trigger rect, flipping up near the bottom. */}
```

- [ ] **Step 5: Add the card-view branch**

Immediately after the closing `)}` you just added at the end of Step 4 (i.e. right before the `{/* Row actions menu ... */}` comment), insert a new block:

```tsx
      {/* Card view */}
      {view === "cards" && (
        list.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No hall bookings match your filters</p>
            <p className="text-xs mt-1 text-muted-foreground">Adjust filters or create a new booking.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(b => {
              const isCancelled = b.status === "cancelled";
              const isModified = !!overrides[b.id];
              const isOpen = actionMenuFor === b.id;
              const balance = b.total - b.advance;
              return (
                <Card
                  key={b.id}
                  onDoubleClick={() => setSelected(b)}
                  title="Double-click to view full booking"
                  className={cn("p-4 hover:shadow-md transition-shadow cursor-pointer select-none", isCancelled && "opacity-60")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("font-semibold truncate", isCancelled && "line-through")}>{b.customer}</p>
                        {isModified && <Badge tone="info">edited</Badge>}
                        {overrides[b.id]?.notes && <FileText className="h-3 w-3 text-brand shrink-0" aria-label="Has special notes" />}
                      </div>
                      <p className="text-xs text-muted-foreground tabular">{b.phone}</p>
                    </div>
                    <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0" />{b.hall}</p>
                    <p className="inline-flex items-center gap-1.5 flex-wrap">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(b.date)}{b.endDate && b.endDate !== b.date ? ` → ${formatDate(b.endDate)}` : ""}
                      <span className="tabular">· {b.start} → {b.end}</span>
                    </p>
                    <p className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" />{b.guests} guests</p>
                  </div>

                  <div className="mt-3"><Badge tone="neutral">{b.package}</Badge></div>

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Total</p>
                      <p className="font-semibold tabular mt-0.5">{money(b.total)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">Balance</p>
                      <p className={cn("font-semibold tabular mt-0.5", balance > 0 ? "text-warning" : "text-success")}>
                        {balance > 0 ? money(balance) : "Paid"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5" data-action-menu>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelected(b); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors"
                      title="View booking detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isCancelled}
                      onClick={e => { e.stopPropagation(); setModifyTarget(b); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Modify booking"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isCancelled}
                      onClick={e => { e.stopPropagation(); setCancelTarget(b); }}
                      className="h-8 w-8 rounded-md border border-border hover:bg-danger hover:text-white hover:border-danger inline-flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Cancel booking"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isOpen) { setActionMenuFor(null); return; }
                          setMenuRect(e.currentTarget.getBoundingClientRect());
                          setActionMenuFor(b.id);
                        }}
                        className={cn(
                          "h-8 w-8 rounded-md border inline-flex items-center justify-center transition-colors",
                          isOpen ? "bg-brand-soft border-brand text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                        )}
                        title="More actions"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

```

- [ ] **Step 6: Type-check**

Run: `cd luxe-pms && npx tsc --noEmit`
Expected: no errors (exit code 0).

- [ ] **Step 7: Lint**

Run: `cd luxe-pms && npm run lint`
Expected: no new errors on `src/app/(app)/halls/page.tsx`.

- [ ] **Step 8: Manual browser verification**

Start the dev environment per this repo's existing convention (`start-dev.ps1`, or `cd luxe-pms && npm run dev` if the backend is already running), then open `/halls`:

1. Confirm the page loads with the **Table** view active by default (matches today's screenshot) and the toggle shows "Table" highlighted.
2. Click **Cards** — confirm the table disappears and a responsive card grid appears (3 columns on a wide viewport, 2 on medium, 1 on narrow), one card per booking, with the same 7 bookings as the table.
3. On a card, confirm: customer name, phone, status badge, hall, date/time, guest count, package badge, total, balance (or "Paid" in green), and the 4 action buttons (View/Modify/Cancel/More) all render with the correct data for at least 2 different bookings (one with a balance due, one settled or cancelled).
4. Click the **Eye** icon on a card — confirm the same `HallDetailDrawer` opens as it does from the table.
5. Click the **More** (⋯) icon on a card — confirm the same dropdown menu opens (Print BEO / Email / WhatsApp / Receive payment / Mark completed / Modify / Cancel as applicable) and that it closes on outside click.
6. Apply a filter (e.g. search for a customer name) in Cards view — confirm the grid filters down and the "N of M" counter updates, matching Table view behavior.
7. Clear filters until zero bookings match — confirm the "No hall bookings match your filters" empty state renders as a card (not a broken/empty grid).
8. Switch back to **Table** — confirm the table view is unaffected and still fully functional (this guards against the Step 4 wrap accidentally breaking table rendering).

Expected: all of the above pass with no console errors.

- [ ] **Step 9: Commit**

```bash
git add luxe-pms/src/app/(app)/halls/page.tsx
git commit -m "feat(luxe-pms): add table/card view toggle to Hall Booking list"
```
