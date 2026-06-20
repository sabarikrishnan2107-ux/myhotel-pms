# Live POS + Setup Menu-Items Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Restaurant POS use real backend data (per-table order ticket + computed KPI strip) and add a full Menu-Items manager (add/edit/delete with photo) to Setup & Settings, sharing one dialog component.

**Architecture:** Pure helpers in `src/lib/` (table-code matching, KPI math) are TDD-unit-tested in the node env. A shared `MenuItemDialog` component (create + edit, with photo upload) is consumed by both the POS quick-add and the new Setup manager. The POS page loads `/fb-orders` and derives the ticket + KPIs; the Setup manager does full CRUD against `/menu-items`. No backend changes.

**Tech Stack:** Next.js 16 / React 19 + TypeScript + Tailwind; vitest (node env); existing Laravel/Postgres API (`/menu-items`, `/pos-tables`, `/fb-orders` all already support what's needed).

## Global Constraints

- All paths are under `luxe-pms/`. Run `npm` commands from `luxe-pms/`.
- Tests run in the **node** environment (`vitest.config.ts`): unit-test **pure functions only**, like `src/lib/utils.test.ts` / `src/lib/menu-item.test.ts`. Do NOT add jsdom/testing-library or new deps. UI tasks are verified by `npm run lint` + `npm run build`.
- This is a customized Next.js 16 — see `luxe-pms/AGENTS.md`; if build output points at framework APIs, consult `node_modules/next/dist/docs/`. These tasks are standard React/TSX, so it should not arise.
- Reuse existing primitives: `Card`, `Button`, `Badge` from `@/components/ui/*`; `Input`, `Label`, `Select` from `@/components/ui/input`; `cn`, `money` from `@/lib/utils`; `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUpload` from `@/lib/api`.
- Existing shared helper `@/lib/menu-item` already exports `MenuSpice`, `MenuItemFormState`, `MenuItemPayload`, `buildMenuItemPayload`, `isValidMenuItemForm` — reuse them, do not duplicate.
- Open F&B order statuses are `placed | preparing | ready` (served/paid/cancelled are closed).
- Photo upload: `apiUpload(file)` → `{ url, path }`; store the `url` string.

---

### Task 1: Pure helpers — categories + POS data math

**Files:**
- Modify: `src/lib/menu-item.ts` (append a categories constant)
- Create: `src/lib/pos-data.ts`
- Test: `src/lib/pos-data.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - In `menu-item.ts`: `MENU_CATEGORIES` (readonly 8-string tuple) and `type MenuCategory`.
  - In `pos-data.ts`: `interface PosKpis { activeKots: number; inQueue: number; cooking: number; avgDwellMin: number | null; covers: number; revenue: number }`; `normalizeTableCode(code: string): string`; `openOrderForTable<T extends { tableNo?: string|null; status?: string }>(orders: T[], tableCode: string): T | null`; `computePosKpis(orders: Array<{ status?: string; total?: number; created_at?: string|null }>, tables: Array<{ covers?: number|null; seatedAt?: string|null }>, now: Date): PosKpis`.

- [ ] **Step 1: Append categories to `menu-item.ts`**

At the end of `src/lib/menu-item.ts` add:

```ts
/** The fixed F&B menu categories used across the POS and Setup manager. */
export const MENU_CATEGORIES = [
  "Starters", "Mains", "Indian", "Continental", "Sides", "Desserts", "Bar", "Beverages",
] as const;
export type MenuCategory = typeof MENU_CATEGORIES[number];
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/pos-data.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeTableCode, openOrderForTable, computePosKpis } from "@/lib/pos-data";
import { MENU_CATEGORIES } from "@/lib/menu-item";

describe("MENU_CATEGORIES", () => {
  it("has the 8 expected categories", () => {
    expect(MENU_CATEGORIES.length).toBe(8);
    expect(MENU_CATEGORIES).toContain("Indian");
  });
});

describe("normalizeTableCode", () => {
  it("upper-cases, strips separators, and drops leading zeros in the number", () => {
    expect(normalizeTableCode("T-07")).toBe("T7");
    expect(normalizeTableCode("t3")).toBe("T3");
    expect(normalizeTableCode("T10")).toBe("T10");
    expect(normalizeTableCode("Bar-5")).toBe("BAR5");
    expect(normalizeTableCode("T-12")).toBe("T12");
  });
});

describe("openOrderForTable", () => {
  const orders = [
    { tableNo: "T-07", status: "preparing", id: 1 },
    { tableNo: "T-02", status: "paid", id: 2 },
    { tableNo: "T-09", status: "ready", id: 3 },
  ];
  it("matches an open order by normalized code", () => {
    expect(openOrderForTable(orders, "T7")?.id).toBe(1);
    expect(openOrderForTable(orders, "T9")?.id).toBe(3);
  });
  it("ignores closed orders (paid/served/cancelled)", () => {
    expect(openOrderForTable(orders, "T2")).toBeNull();
  });
  it("returns null when no table matches", () => {
    expect(openOrderForTable(orders, "T99")).toBeNull();
  });
});

describe("computePosKpis", () => {
  const now = new Date("2026-06-20T13:00:00Z");
  const orders = [
    { status: "placed", total: 1000, created_at: "2026-06-20T12:58:00Z" },
    { status: "preparing", total: 1500, created_at: "2026-06-20T12:50:00Z" },
    { status: "ready", total: 800, created_at: "2026-06-20T12:46:00Z" },
    { status: "paid", total: 1300, created_at: "2026-06-19T20:00:00Z" }, // yesterday
  ];
  const tables = [
    { covers: 3, seatedAt: "12:30" },
    { covers: 4, seatedAt: "12:00" },
    { covers: 0, seatedAt: null },
  ];
  it("counts active KOTs and the queue/cooking split", () => {
    const k = computePosKpis(orders, tables, now);
    expect(k.activeKots).toBe(3);
    expect(k.inQueue).toBe(1);
    expect(k.cooking).toBe(1);
  });
  it("sums today's revenue only", () => {
    expect(computePosKpis(orders, tables, now).revenue).toBe(3300);
  });
  it("sums covers across tables", () => {
    expect(computePosKpis(orders, tables, now).covers).toBe(7);
  });
  it("averages dwell from seatedAt, null when none", () => {
    expect(computePosKpis(orders, tables, now).avgDwellMin).toBe(45); // (30 + 60) / 2
    expect(computePosKpis(orders, [{ covers: 1, seatedAt: null }], now).avgDwellMin).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- pos-data`
Expected: FAIL — cannot resolve `@/lib/pos-data`.

- [ ] **Step 4: Implement `pos-data.ts`**

Create `src/lib/pos-data.ts`:

```ts
// Pure helpers for the Restaurant POS: tolerant table-code matching and KPI
// math. Framework-free so they unit-test in the node environment.

export interface PosKpis {
  activeKots: number;
  inQueue: number;
  cooking: number;
  avgDwellMin: number | null;
  covers: number;
  revenue: number;
}

const OPEN_STATUSES = ["placed", "preparing", "ready"];
const lc = (s?: string | null) => (s ?? "").toLowerCase();

/**
 * Canonicalise a table code so the POS floor map (T1, T2, …) and the seeded
 * F&B orders (T-07, Bar-5, …) line up: upper-case, drop separators, and strip
 * leading zeros from the trailing number. "T-07" → "T7", "T10" → "T10".
 */
export function normalizeTableCode(code: string): string {
  const up = (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = up.match(/^([A-Z]*)(\d*)$/);
  if (!m) return up;
  const [, prefix, digits] = m;
  return prefix + digits.replace(/^0+/, "");
}

/** The open order for a table (status placed/preparing/ready), matched tolerantly. */
export function openOrderForTable<T extends { tableNo?: string | null; status?: string }>(
  orders: T[],
  tableCode: string,
): T | null {
  const target = normalizeTableCode(tableCode);
  return (
    orders.find(
      o => OPEN_STATUSES.includes(lc(o.status)) && normalizeTableCode(o.tableNo ?? "") === target,
    ) ?? null
  );
}

/** Live KPI numbers for the POS header, computed from orders + the floor map. */
export function computePosKpis(
  orders: Array<{ status?: string; total?: number; created_at?: string | null }>,
  tables: Array<{ covers?: number | null; seatedAt?: string | null }>,
  now: Date,
): PosKpis {
  const inQueue = orders.filter(o => lc(o.status) === "placed").length;
  const cooking = orders.filter(o => lc(o.status) === "preparing").length;
  const ready = orders.filter(o => lc(o.status) === "ready").length;

  const today = now.toISOString().slice(0, 10);
  const revenue = orders
    .filter(o => (o.created_at ?? "").slice(0, 10) === today)
    .reduce((s, o) => s + (Number(o.total) || 0), 0);

  const covers = tables.reduce((s, t) => s + (Number(t.covers) || 0), 0);

  const dwell: number[] = [];
  for (const t of tables) {
    const at = (t.seatedAt ?? "").trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(at);
    if (!m) continue;
    const seated = new Date(now);
    seated.setHours(Number(m[1]), Number(m[2]), 0, 0);
    dwell.push(Math.max(0, Math.round((now.getTime() - seated.getTime()) / 60000)));
  }
  const avgDwellMin = dwell.length
    ? Math.round(dwell.reduce((a, b) => a + b, 0) / dwell.length)
    : null;

  return { activeKots: inQueue + cooking + ready, inQueue, cooking, avgDwellMin, covers, revenue };
}
```

> Note on the dwell test: `now` is `13:00Z` and `seated.setHours` uses local time, so the absolute minutes can vary by timezone — but both seated times shift by the same offset, so their **difference** (30 and 60 → avg 45) is timezone-stable. The assertion checks the average, which holds regardless of TZ.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- pos-data`
Expected: PASS (all groups).

- [ ] **Step 6: Commit**

```bash
git add src/lib/pos-data.ts src/lib/pos-data.test.ts src/lib/menu-item.ts
git commit -m "feat(pos): pure helpers for table-code match, KPIs, menu categories"
```

---

### Task 2: Shared `MenuItemDialog` + refactor POS quick-add to use it

**Files:**
- Create: `src/components/menu-item-dialog.tsx`
- Modify: `src/app/(app)/fb/pos/page.tsx`

**Interfaces:**
- Consumes from Task 1: `MENU_CATEGORIES` from `@/lib/menu-item`.
- Consumes existing: `buildMenuItemPayload`, `isValidMenuItemForm`, `MenuItemPayload`, `MenuSpice` from `@/lib/menu-item`; `apiUpload` from `@/lib/api`.
- Produces: `MenuItemDialog` component and `interface MenuItemDialogValues { name?: string; cat?: string; price?: number; veg?: boolean; spice?: MenuSpice | null; tag?: string | null; photo?: string | null }`.

- [ ] **Step 1: Create the shared dialog**

Create `src/components/menu-item-dialog.tsx`:

```tsx
"use client";
import * as React from "react";
import { UtensilsCrossed, X, Plus, ImageIcon, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiUpload } from "@/lib/api";
import {
  MENU_CATEGORIES,
  buildMenuItemPayload,
  isValidMenuItemForm,
  type MenuItemPayload,
  type MenuSpice,
} from "@/lib/menu-item";

export interface MenuItemDialogValues {
  name?: string;
  cat?: string;
  price?: number;
  veg?: boolean;
  spice?: MenuSpice | null;
  tag?: string | null;
  photo?: string | null;
}

export function MenuItemDialog({ mode, initial, saving, onClose, onSave }: {
  mode: "create" | "edit";
  initial?: MenuItemDialogValues | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: MenuItemPayload) => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [cat, setCat] = React.useState<string>(initial?.cat ?? MENU_CATEGORIES[0]);
  const [price, setPrice] = React.useState(initial?.price ?? 0);
  const [veg, setVeg] = React.useState(initial?.veg ?? true);
  const [spice, setSpice] = React.useState<MenuSpice | "none">(initial?.spice ?? "none");
  const [tag, setTag] = React.useState(initial?.tag ?? "");
  const [photo, setPhoto] = React.useState(initial?.photo ?? "");
  const [uploading, setUploading] = React.useState(false);

  const captureRef = React.useRef<HTMLInputElement>(null);
  const uploadRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await apiUpload(file);
      setPhoto(url);
    } catch {
      // Upload failed — leave photo empty; the dialog stays open to retry.
    } finally {
      setUploading(false);
    }
  };

  const form = { name, cat, price, veg, spice, tag, photo };
  const valid = isValidMenuItemForm(form);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><UtensilsCrossed className="h-5 w-5" /></span>
            <div>
              <h3 className="font-semibold">{mode === "edit" ? "Edit menu item" : "New menu item"}</h3>
              <p className="text-xs text-muted-foreground">Saved to the catalog · appears on the POS menu</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Photo */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dish photo (optional)</Label>
            <input ref={captureRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { void handleFile(e.target.files); e.target.value = ""; }} />
            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={e => { void handleFile(e.target.files); e.target.value = ""; }} />
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 rounded-md border border-border bg-surface-sunken overflow-hidden inline-flex items-center justify-center relative">
                {photo ? (
                  <>
                    <img src={photo} alt="Dish preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhoto("")} className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-foreground/70 text-background inline-flex items-center justify-center"><X className="h-3 w-3" /></button>
                  </>
                ) : (
                  <ImageIcon className="h-7 w-7 text-subtle-foreground/60" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => captureRef.current?.click()}>
                  <ImageIcon className="h-3.5 w-3.5" />{uploading ? "Uploading…" : "Take photo"}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => uploadRef.current?.click()}>
                  <ImageIcon className="h-3.5 w-3.5" />Upload
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Item name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Paneer Tikka" autoFocus className="h-9" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={cat} onChange={e => setCat(e.target.value)}>
                {MENU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price (₹)</Label>
              <Input type="number" min={0} value={price} onChange={e => setPrice(Math.max(0, Number(e.target.value)))} className="h-9 tabular" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {([["Veg", true], ["Non-veg", false]] as const).map(([label, val]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setVeg(val)}
                    className={cn(
                      "h-10 rounded-md border text-xs font-medium transition-colors",
                      veg === val ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Spice</Label>
              <Select value={spice} onChange={e => setSpice(e.target.value as MenuSpice | "none")}>
                <option value="none">None</option>
                <option value="mild">Mild</option>
                <option value="medium">Medium</option>
                <option value="hot">Hot</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tag (optional)</Label>
            <Input value={tag} onChange={e => setTag(e.target.value)} placeholder="e.g. Chef's pick" className="h-9" />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-surface-elevated flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid || uploading || saving} onClick={() => onSave(buildMenuItemPayload(form))}>
            {mode === "edit" ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {mode === "edit" ? "Save changes" : "Add to menu"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Point the POS imports at the shared dialog**

In `src/app/(app)/fb/pos/page.tsx`:

(a) Change the api import from:

```tsx
import { apiGet, apiPost, apiUpload } from "@/lib/api";
```
to:
```tsx
import { apiGet, apiPost } from "@/lib/api";
```

(b) Change the menu-item helper import from:

```tsx
import { buildMenuItemPayload, isValidMenuItemForm, type MenuItemFormState } from "@/lib/menu-item";
```
to:
```tsx
import { type MenuItemPayload } from "@/lib/menu-item";
import { MenuItemDialog } from "@/components/menu-item-dialog";
```

- [ ] **Step 3: Update `addMenuItem` to take a payload**

Replace the existing handler:

```tsx
  const addMenuItem = async (form: MenuItemFormState) => {
    const payload = buildMenuItemPayload(form);
    try {
      const created = await apiPost<{ id: number | string }>("/menu-items", payload);
      const item: Item = { ...payload, id: String(created.id), cat: payload.cat as Category };
      setMenu(m => [item, ...m]);
      setCat(item.cat);
      setNewItemOpen(false);
      showToast(`${item.name} added to menu`);
    } catch {
      showToast("⚠ Couldn't save item — backend offline");
    }
  };
```

with:

```tsx
  const addMenuItem = async (payload: MenuItemPayload) => {
    try {
      const created = await apiPost<{ id: number | string }>("/menu-items", payload);
      const item: Item = { ...payload, id: String(created.id), cat: payload.cat as Category };
      setMenu(m => [item, ...m]);
      setCat(item.cat);
      setNewItemOpen(false);
      showToast(`${item.name} added to menu`);
    } catch {
      showToast("⚠ Couldn't save item — backend offline");
    }
  };
```

- [ ] **Step 4: Swap the modal render**

Replace:

```tsx
      {newItemOpen && (
        <NewMenuItemModal
          initialCat={cat}
          onClose={() => setNewItemOpen(false)}
          onSave={addMenuItem}
        />
      )}
```

with:

```tsx
      {newItemOpen && (
        <MenuItemDialog
          mode="create"
          initial={{ cat }}
          onClose={() => setNewItemOpen(false)}
          onSave={addMenuItem}
        />
      )}
```

- [ ] **Step 5: Delete the now-unused `NewMenuItemModal`**

Remove the entire `NewMenuItemModal` function from the bottom of `src/app/(app)/fb/pos/page.tsx` (the block starting with `// ============= NEW MENU ITEM MODAL =============` through its closing `}`). The shared `MenuItemDialog` replaces it.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run lint`
Expected: no new errors in `fb/pos/page.tsx` or `components/menu-item-dialog.tsx`.

Run: `npm run build`
Expected: build succeeds (confirms the dialog/page types line up and no dangling references to `NewMenuItemModal`, `buildMenuItemPayload`, `isValidMenuItemForm`, `apiUpload`, or `MenuItemFormState` remain in the page).

- [ ] **Step 7: Commit**

```bash
git add "src/components/menu-item-dialog.tsx" "src/app/(app)/fb/pos/page.tsx"
git commit -m "refactor(pos): extract shared MenuItemDialog; POS quick-add uses it"
```

---

### Task 3: POS live order ticket + KPI strip

**Files:**
- Modify: `src/app/(app)/fb/pos/page.tsx`

**Interfaces:**
- Consumes from Task 1: `computePosKpis`, `openOrderForTable` from `@/lib/pos-data`.
- Produces: nothing for later tasks.

- [ ] **Step 1: Import the POS data helpers**

In `src/app/(app)/fb/pos/page.tsx`, directly below the `import { MenuItemDialog } from "@/components/menu-item-dialog";` line, add:

```tsx
import { computePosKpis, openOrderForTable } from "@/lib/pos-data";
```

- [ ] **Step 2: Replace the `PRELOADED` order seed with live F&B orders**

(a) Change the orders state initialiser from:

```tsx
  const [orders, setOrders] = React.useState<Record<string, LineItem[]>>(PRELOADED);
```
to:
```tsx
  const [orders, setOrders] = React.useState<Record<string, LineItem[]>>({});
```

(b) Delete the `PRELOADED` constant definition (the `const PRELOADED: Record<string, LineItem[]> = { ... };` block near the top of the file) — it is now unused.

(c) Add live F&B orders state + fetch. Immediately after the `tables` effect (the `apiGet(... "/pos-tables")` block), add:

```tsx
  // Live F&B orders — used to hydrate the selected table's ticket and the KPI strip.
  type FbOrderRow = { id: number | string; tableNo?: string; status?: string; total?: number; items?: Array<{ name: string; qty: number; price: number }> | null; created_at?: string };
  const [fbOrders, setFbOrders] = React.useState<FbOrderRow[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    apiGet<FbOrderRow[]>("/fb-orders").then(r => { if (!cancelled && Array.isArray(r)) setFbOrders(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // When a table is selected, hydrate its ticket from the open F&B order once
  // (further edits stay in local state and are not overwritten).
  React.useEffect(() => {
    setOrders(o => {
      if (o[selectedTable]) return o;
      const open = openOrderForTable(fbOrders, selectedTable);
      if (!open || !Array.isArray(open.items) || open.items.length === 0) return o;
      const seeded: LineItem[] = open.items.map((it, i) => ({
        uid: `${selectedTable}-fb-${i}`, itemId: "", name: it.name, price: Number(it.price) || 0, qty: Number(it.qty) || 1,
      }));
      return { ...o, [selectedTable]: seeded };
    });
  }, [selectedTable, fbOrders]);
```

- [ ] **Step 3: Compute live KPIs**

Immediately after the `filteredItems` `useMemo` block, add:

```tsx
  const kpis = React.useMemo(() => computePosKpis(fbOrders, tables, new Date()), [fbOrders, tables]);
```

- [ ] **Step 4: Replace the hardcoded KPI strip values**

Replace the KPI strip block:

```tsx
        <KpiCard icon={ChefHat} tone="warning" label="Active KOTs" value="7" sub="3 in queue · 4 cooking" />
        <KpiCard icon={Clock} tone="info" label="Avg dwell" value="48 min" sub="vs 52 min yest" />
        <KpiCard icon={Users} tone="brand" label="Covers today" value="142" sub="Lunch + Dinner" />
        <KpiCard icon={TrendingUp} tone="success" label="Revenue today" value={money(186400)} sub="Target ₹2.2L" />
```

with:

```tsx
        <KpiCard icon={ChefHat} tone="warning" label="Active KOTs" value={String(kpis.activeKots)} sub={`${kpis.inQueue} in queue · ${kpis.cooking} cooking`} />
        <KpiCard icon={Clock} tone="info" label="Avg dwell" value={kpis.avgDwellMin == null ? "—" : `${kpis.avgDwellMin} min`} sub="live floor" />
        <KpiCard icon={Users} tone="brand" label="Covers" value={String(kpis.covers)} sub="seated now" />
        <KpiCard icon={TrendingUp} tone="success" label="Revenue today" value={money(kpis.revenue)} sub="all orders today" />
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run lint`
Expected: no new errors; no unused-variable error for `PRELOADED` (it was deleted).

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/fb/pos/page.tsx"
git commit -m "feat(pos): live per-table ticket + computed KPI strip from /fb-orders"
```

---

### Task 4: Setup → Menu Items manager (full CRUD + photo)

**Files:**
- Create: `src/app/(app)/setup/menu-items-manager.tsx`
- Modify: `src/app/(app)/setup/setup-view.tsx`

**Interfaces:**
- Consumes: `MenuItemDialog`, `MenuItemDialogValues` from `@/components/menu-item-dialog`; `MenuItemPayload` from `@/lib/menu-item`; `apiGet`, `apiPost`, `apiPut`, `apiDelete` from `@/lib/api`.
- Produces: `MenuItemsManager` component.

- [ ] **Step 1: Create the manager component**

Create `src/app/(app)/setup/menu-items-manager.tsx`:

```tsx
"use client";
import * as React from "react";
import { Plus, Edit, Trash2, ImageIcon, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { MenuItemDialog, type MenuItemDialogValues } from "@/components/menu-item-dialog";
import { type MenuItemPayload } from "@/lib/menu-item";

type MenuRow = {
  id: number | string;
  name: string;
  cat: string;
  price: number;
  veg?: boolean;
  spice?: "mild" | "medium" | "hot" | null;
  tag?: string | null;
  photo?: string | null;
};

export function MenuItemsManager({ onToast }: { onToast?: (m: string) => void }) {
  const [rows, setRows] = React.useState<MenuRow[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: MenuRow | null } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<MenuRow | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<MenuRow[]>("/menu-items").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toast = (m: string) => onToast?.(m);

  const save = async (payload: MenuItemPayload) => {
    setSaving(true);
    try {
      if (dialog?.mode === "edit" && dialog.row) {
        const updated = await apiPut<MenuRow>(`/menu-items/${dialog.row.id}`, payload);
        setRows(rs => rs.map(r => (r.id === dialog.row!.id ? { ...r, ...updated } : r)));
        toast(`${payload.name} updated`);
      } else {
        const created = await apiPost<MenuRow>("/menu-items", payload);
        setRows(rs => [created, ...rs]);
        toast(`${payload.name} added to menu`);
      }
      setDialog(null);
    } catch {
      toast("⚠ Couldn't save item — backend offline");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: MenuRow) => {
    setConfirmDelete(null);
    try {
      await apiDelete(`/menu-items/${row.id}`);
      setRows(rs => rs.filter(r => r.id !== row.id));
      toast(`${row.name} removed`);
    } catch {
      toast("⚠ Couldn't delete item — backend offline");
    }
  };

  const initialFor = (row: MenuRow): MenuItemDialogValues => ({
    name: row.name, cat: row.cat, price: row.price, veg: row.veg ?? true,
    spice: row.spice ?? null, tag: row.tag ?? null, photo: row.photo ?? null,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-accent" />Menu Items</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} dishes · used by the Restaurant POS</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create", row: null })}>
          <Plus className="h-4 w-4" />Add item
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
          No menu items yet. Click “Add item” to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row => (
            <Card key={row.id} className="p-0 overflow-hidden flex flex-col">
              <div className="aspect-[4/3] bg-surface-sunken relative flex items-center justify-center">
                {row.photo ? (
                  <img src={row.photo} alt={row.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-subtle-foreground/60" />
                )}
                {row.tag && <Badge tone="accent" className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0">{row.tag}</Badge>}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-tight">{row.name}</p>
                  <span className="text-sm font-semibold tabular text-brand shrink-0">{money(row.price)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge tone="neutral">{row.cat}</Badge>
                  <Badge tone={row.veg ? "success" : "danger"}>{row.veg ? "Veg" : "Non-veg"}</Badge>
                  {row.spice && <Badge tone="warning">{row.spice}</Badge>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setDialog({ mode: "edit", row })}>
                    <Edit className="h-3 w-3" />Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}>
                    <Trash2 className="h-3 w-3" />Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <MenuItemDialog
          mode={dialog.mode}
          initial={dialog.row ? initialFor(dialog.row) : null}
          saving={saving}
          onClose={() => setDialog(null)}
          onSave={save}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Delete menu item</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Remove “{confirmDelete.name}” from the catalog? This can’t be undone.</p>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}>
                <Trash2 className="h-3.5 w-3.5" />Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Import the manager into setup-view**

In `src/app/(app)/setup/setup-view.tsx`, below the existing
`import { PreferencesPanel, ... } from "./personal-panels";` line, add:

```tsx
import { MenuItemsManager } from "./menu-items-manager";
```

- [ ] **Step 3: Add the section entry**

In the `SECTIONS` array, immediately after the `food` entry
(`{ id: "food", ... }`), add:

```tsx
  { id: "menu-items",  group: "Rates & Packages" as SectionGroup,        label: "Menu Items",               icon: Utensils,     hint: "Dish catalog · price · photo · POS", accent: "accent"  as const },
```

(`Utensils` is already imported in this file.)

- [ ] **Step 4: Satisfy the `INITIAL_DATA` exhaustiveness**

`INITIAL_DATA` is typed `Record<SectionId, Field[]>`, so the new section id needs a key. In the "Custom-rendered sections" area of `INITIAL_DATA` (where `preferences`/`food` live), add:

```tsx
    "menu-items": [],
```

- [ ] **Step 5: Render the manager for the new section**

In the panel render area, immediately after the `{active === "food" && ( ... )}` block, add:

```tsx
            {active === "menu-items" && <MenuItemsManager onToast={showToast} />}
```

- [ ] **Step 6: Typecheck and lint**

Run: `npm run lint`
Expected: no new errors in `setup-view.tsx` or `menu-items-manager.tsx`.

Run: `npm run build`
Expected: build succeeds (confirms the new `SectionId` is exhaustively handled and the manager types line up).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/setup/menu-items-manager.tsx" "src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(setup): Menu Items manager — add/edit/delete dishes with photo"
```

---

## Self-Review

**Spec coverage:**
- Setup Menu Items manager (CRUD + photo, real `/menu-items`) → Task 4. ✓
- Shared `MenuItemDialog` (create+edit), POS refactored to use it → Task 2. ✓
- POS order ticket from `/fb-orders` (tolerant match, removes `PRELOADED`) → Task 1 (`openOrderForTable`) + Task 3. ✓
- POS KPI strip computed (Active KOTs/Avg dwell/Covers/Revenue) → Task 1 (`computePosKpis`) + Task 3. ✓
- Keep the POS quick `+ New item` → preserved (Task 2 keeps `newItemOpen` + button, swaps modal only). ✓
- Floor map already live from `/pos-tables`; offline fallback kept → unchanged (verified at end), no task needed. ✓
- DRY via shared dialog and shared helpers → Tasks 1, 2. ✓
- No backend/schema changes → confirmed; all tasks are frontend. ✓

**Placeholder scan:** No TBD/TODO/"handle errors" stand-ins; all steps carry complete code. The two upload/save `catch` blocks are intentional offline-fallbacks with explanatory comments/toasts. ✓

**Type consistency:** `MENU_CATEGORIES`/`MenuCategory` (Task 1) consumed by the dialog (Task 2). `PosKpis`/`normalizeTableCode`/`openOrderForTable`/`computePosKpis` (Task 1) consumed in Task 3 with matching signatures. `MenuItemDialog`/`MenuItemDialogValues` (Task 2) consumed in Task 4. `MenuItemPayload` (existing) flows dialog→`onSave`→`apiPost`/`apiPut`. POS `addMenuItem` switches from `MenuItemFormState` to `MenuItemPayload` (Task 2 Step 3) and the dialog supplies a `MenuItemPayload` — consistent. `FbOrderRow.items` shape (`{name,qty,price}`) matches `openOrderForTable`/`computePosKpis` inputs. ✓
