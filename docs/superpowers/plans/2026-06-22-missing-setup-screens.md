# Missing Setup Screens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add three simple CRUD Setup sections — Meal Plans, Pricing Rules, Rate Restrictions — over the existing backend resources.

**Architecture:** Each is a self-contained manager component (same pattern as `group-services-manager.tsx`) wired into `setup-view.tsx` with the five required touch-points. Frontend only; backend resources already exist.

**Tech Stack:** Next.js 16 / React 19 / TS. No backend, no unit tests (list-CRUD, no pure computation — consistent with the menu-items/group-services managers).

## Global Constraints

- Frontend `luxe-pms/` (run `npm` from there). Verify via `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- **Every new Setup section MUST be added to BOTH `CUSTOM_SECTIONS` and `INITIAL_DATA`** in `setup-view.tsx` (omitting either crashes the section with `undefined.map`).
- Reuse `apiGet/apiPost/apiPut/apiDelete` from `@/lib/api`, `Card`/`Button`/`Badge`/`Input`/`Label`/`Select`, `money` from `@/lib/utils`.
- Make ONLY the targeted edits to the large shared `setup-view.tsx`.

---

### Task 1: Meal Plans manager

**Files:**
- Create: `luxe-pms/src/app/(app)/setup/meal-plans-manager.tsx`
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`

**Interfaces:** Consumes `/meal-plans` (`{id, code, name, perPaxPerDay, desc, active}`). Produces `MealPlansManager`.

- [ ] **Step 1: Create the manager**

Create `luxe-pms/src/app/(app)/setup/meal-plans-manager.tsx`:

```tsx
"use client";
import * as React from "react";
import { Plus, Edit, Trash2, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Row = { id: number | string; code: string; name: string; perPaxPerDay: number; desc: string; active: boolean };
const blank = (): Row => ({ id: "", code: "", name: "", perPaxPerDay: 0, desc: "", active: true });

export function MealPlansManager({ onToast }: { onToast?: (m: string) => void }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: Row } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<Row | null>(null);
  const toast = (m: string) => onToast?.(m);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>("/meal-plans").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = async (row: Row) => {
    setSaving(true);
    const body = { code: row.code.trim(), name: row.name.trim(), perPaxPerDay: Number(row.perPaxPerDay) || 0, desc: row.desc.trim(), active: row.active };
    try {
      if (dialog?.mode === "edit") {
        const up = await apiPut<Row>(`/meal-plans/${row.id}`, body);
        setRows(rs => rs.map(r => (r.id === row.id ? { ...r, ...up } : r)));
        toast(`${body.name} updated`);
      } else {
        const created = await apiPost<Row>("/meal-plans", body);
        setRows(rs => [created, ...rs]);
        toast(`${body.name} added`);
      }
      setDialog(null);
    } catch { toast("⚠ Couldn't save — backend offline"); } finally { setSaving(false); }
  };

  const remove = async (row: Row) => {
    setConfirmDelete(null);
    try { await apiDelete(`/meal-plans/${row.id}`); setRows(rs => rs.filter(r => r.id !== row.id)); toast(`${row.name} removed`); }
    catch { toast("⚠ Couldn't delete — backend offline"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><Utensils className="h-4 w-4 text-accent" />Meal Plans</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} plans · per-pax-per-day pricing (EP/CP/MAP/AP)</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create", row: blank() })}><Plus className="h-4 w-4" />Add plan</Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">No meal plans yet. Click &ldquo;Add plan&rdquo;.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row => (
            <Card key={row.id} className="p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{row.name} <span className="text-muted-foreground">({row.code})</span></p>
                <span className="text-sm font-semibold tabular text-brand shrink-0">{money(row.perPaxPerDay)}/pax</span>
              </div>
              {row.desc && <p className="text-xs text-muted-foreground line-clamp-2">{row.desc}</p>}
              <div className="flex items-center gap-1.5">{!row.active && <Badge tone="warning">inactive</Badge>}</div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setDialog({ mode: "edit", row })}><Edit className="h-3 w-3" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}><Trash2 className="h-3 w-3" />Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">{dialog.mode === "edit" ? "Edit meal plan" : "Add meal plan"}</h3></div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Code</Label><Input value={dialog.row.code} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, code: e.target.value } }))} className="h-9" placeholder="CP" autoFocus /></div>
                <div className="space-y-1.5"><Label className="text-xs">Per pax/day (₹)</Label><Input type="number" min={0} value={dialog.row.perPaxPerDay} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, perPaxPerDay: Math.max(0, Number(e.target.value)) } }))} className="h-9 tabular" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={dialog.row.name} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, name: e.target.value } }))} className="h-9" placeholder="Continental Plan" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={dialog.row.desc} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, desc: e.target.value } }))} className="h-9" placeholder="Room + breakfast" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={dialog.row.active} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, active: e.target.checked } }))} />Active</label>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" disabled={saving || !dialog.row.code.trim() || !dialog.row.name.trim()} onClick={() => save(dialog.row)}>{saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add plan"}</Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Delete meal plan</h3><p className="text-xs text-muted-foreground mt-0.5">Remove &ldquo;{confirmDelete.name}&rdquo;?</p></div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30"><Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into setup-view** (5 edits in `luxe-pms/src/app/(app)/setup/setup-view.tsx`)

(a) Import below the `GroupServicesManager` import:
```tsx
import { MealPlansManager } from "./meal-plans-manager";
```
(b) `SECTIONS` entry after the `group-services` entry:
```tsx
  { id: "meal-plans", group: "Rates & Packages" as SectionGroup,         label: "Meal Plans",               icon: Utensils,     hint: "EP/CP/MAP/AP · per-pax-per-day", accent: "accent" as const },
```
(c) Add `"meal-plans"` to the `CUSTOM_SECTIONS` set.
(d) Add to `INITIAL_DATA`: `"meal-plans": [],`
(e) Render line after the `group-services` render line:
```tsx
            {active === "meal-plans" && <MealPlansManager onToast={showToast} />}
```

- [ ] **Step 3: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0; `npm run lint` → no new errors; `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/meal-plans-manager.tsx" "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(setup): Meal Plans manager section"
```

---

### Task 2: Pricing Rules manager

**Files:**
- Create: `luxe-pms/src/app/(app)/setup/pricing-rules-manager.tsx`
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`

**Interfaces:** Consumes `/pricing-rules` (`{id, name, trigger, adjustment, scope, enabled}`). Produces `PricingRulesManager`.

- [ ] **Step 1: Create the manager**

Create `luxe-pms/src/app/(app)/setup/pricing-rules-manager.tsx` — same structure as Task 1's manager with these differences: `Row = { id; name: string; trigger: string; adjustment: string; scope: string; enabled: boolean }`; `blank()` returns `{ id:"", name:"", trigger:"", adjustment:"", scope:"", enabled:true }`; resource path `/pricing-rules`; required field is `name` only; header icon `Tag`, title "Pricing Rules", sub "{n} rules · dynamic rate adjustments". Card shows `row.name`, the `row.adjustment` as a brand badge, `row.trigger` as muted text, and an `inactive`/`enabled` badge from `enabled`. Dialog fields: Name (required), Trigger (text, placeholder "Occupancy > 80%"), Adjustment (text, placeholder "+15%"), Scope (text, placeholder "All room types"), Enabled (checkbox). The `save` body = `{ name: name.trim(), trigger: trigger.trim(), adjustment: adjustment.trim(), scope: scope.trim(), enabled }`.

Full component (transcribe):

```tsx
"use client";
import * as React from "react";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Row = { id: number | string; name: string; trigger: string; adjustment: string; scope: string; enabled: boolean };
const blank = (): Row => ({ id: "", name: "", trigger: "", adjustment: "", scope: "", enabled: true });

export function PricingRulesManager({ onToast }: { onToast?: (m: string) => void }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: Row } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<Row | null>(null);
  const toast = (m: string) => onToast?.(m);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>("/pricing-rules").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = async (row: Row) => {
    setSaving(true);
    const body = { name: row.name.trim(), trigger: row.trigger.trim(), adjustment: row.adjustment.trim(), scope: row.scope.trim(), enabled: row.enabled };
    try {
      if (dialog?.mode === "edit") {
        const up = await apiPut<Row>(`/pricing-rules/${row.id}`, body);
        setRows(rs => rs.map(r => (r.id === row.id ? { ...r, ...up } : r)));
        toast(`${body.name} updated`);
      } else {
        const created = await apiPost<Row>("/pricing-rules", body);
        setRows(rs => [created, ...rs]);
        toast(`${body.name} added`);
      }
      setDialog(null);
    } catch { toast("⚠ Couldn't save — backend offline"); } finally { setSaving(false); }
  };

  const remove = async (row: Row) => {
    setConfirmDelete(null);
    try { await apiDelete(`/pricing-rules/${row.id}`); setRows(rs => rs.filter(r => r.id !== row.id)); toast(`${row.name} removed`); }
    catch { toast("⚠ Couldn't delete — backend offline"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><Tag className="h-4 w-4 text-accent" />Pricing Rules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} rules · dynamic rate adjustments</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create", row: blank() })}><Plus className="h-4 w-4" />Add rule</Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">No pricing rules yet. Click &ldquo;Add rule&rdquo;.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row => (
            <Card key={row.id} className="p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{row.name}</p>
                {row.adjustment && <Badge tone="brand">{row.adjustment}</Badge>}
              </div>
              {row.trigger && <p className="text-xs text-muted-foreground">When: {row.trigger}</p>}
              {row.scope && <p className="text-[11px] text-subtle-foreground">{row.scope}</p>}
              <div className="flex items-center gap-1.5">{!row.enabled && <Badge tone="warning">disabled</Badge>}</div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setDialog({ mode: "edit", row })}><Edit className="h-3 w-3" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}><Trash2 className="h-3 w-3" />Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">{dialog.mode === "edit" ? "Edit pricing rule" : "Add pricing rule"}</h3></div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={dialog.row.name} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, name: e.target.value } }))} className="h-9" placeholder="High-occupancy uplift" autoFocus /></div>
              <div className="space-y-1.5"><Label className="text-xs">Trigger</Label><Input value={dialog.row.trigger} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, trigger: e.target.value } }))} className="h-9" placeholder="Occupancy > 80%" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Adjustment</Label><Input value={dialog.row.adjustment} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, adjustment: e.target.value } }))} className="h-9" placeholder="+15%" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Scope</Label><Input value={dialog.row.scope} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, scope: e.target.value } }))} className="h-9" placeholder="All room types" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand" checked={dialog.row.enabled} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, enabled: e.target.checked } }))} />Enabled</label>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" disabled={saving || !dialog.row.name.trim()} onClick={() => save(dialog.row)}>{saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add rule"}</Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Delete pricing rule</h3><p className="text-xs text-muted-foreground mt-0.5">Remove &ldquo;{confirmDelete.name}&rdquo;?</p></div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30"><Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into setup-view** (5 edits)

(a) `import { PricingRulesManager } from "./pricing-rules-manager";`
(b) `SECTIONS` entry after `meal-plans`:
```tsx
  { id: "pricing-rules", group: "Rates & Packages" as SectionGroup,      label: "Pricing Rules",            icon: Tag,          hint: "Dynamic rate adjustments · triggers", accent: "accent" as const },
```
(`Tag` is already imported in setup-view.) (c) add `"pricing-rules"` to `CUSTOM_SECTIONS`; (d) add `"pricing-rules": [],` to `INITIAL_DATA`; (e) render line after the `meal-plans` render line:
```tsx
            {active === "pricing-rules" && <PricingRulesManager onToast={showToast} />}
```

- [ ] **Step 3: Typecheck + lint + build** — same as Task 1 Step 3.

- [ ] **Step 4: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/pricing-rules-manager.tsx" "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(setup): Pricing Rules manager section"
```

---

### Task 3: Rate Restrictions manager

**Files:**
- Create: `luxe-pms/src/app/(app)/setup/rate-restrictions-manager.tsx`
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`

**Interfaces:** Consumes `/rate-restrictions` (`{id, fromIso, toIso, roomType, kind, value, channels: string[]}`). Produces `RateRestrictionsManager`.

- [ ] **Step 1: Create the manager**

Create `luxe-pms/src/app/(app)/setup/rate-restrictions-manager.tsx`:

```tsx
"use client";
import * as React from "react";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Row = { id: number | string; fromIso: string; toIso: string; roomType: string; kind: string; value: string; channels: string[] };
const KINDS = ["Min stay", "Max stay", "Closed to arrival", "Closed to departure", "Stop sell"];
const blank = (): Row => ({ id: "", fromIso: "", toIso: "", roomType: "", kind: "Min stay", value: "", channels: [] });

export function RateRestrictionsManager({ onToast }: { onToast?: (m: string) => void }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: Row; channelsText: string } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<Row | null>(null);
  const toast = (m: string) => onToast?.(m);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>("/rate-restrictions").then(r => { if (!cancelled && Array.isArray(r)) setRows(r.map(x => ({ ...x, channels: Array.isArray(x.channels) ? x.channels : [] }))); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    const row = dialog.row;
    const channels = dialog.channelsText.split(",").map(s => s.trim()).filter(Boolean);
    const body = { fromIso: row.fromIso, toIso: row.toIso, roomType: row.roomType.trim(), kind: row.kind, value: row.value.trim(), channels };
    try {
      if (dialog.mode === "edit") {
        const up = await apiPut<Row>(`/rate-restrictions/${row.id}`, body);
        setRows(rs => rs.map(r => (r.id === row.id ? { ...r, ...up, channels } : r)));
        toast("Restriction updated");
      } else {
        const created = await apiPost<Row>("/rate-restrictions", body);
        setRows(rs => [{ ...created, channels }, ...rs]);
        toast("Restriction added");
      }
      setDialog(null);
    } catch { toast("⚠ Couldn't save — backend offline"); } finally { setSaving(false); }
  };

  const remove = async (row: Row) => {
    setConfirmDelete(null);
    try { await apiDelete(`/rate-restrictions/${row.id}`); setRows(rs => rs.filter(r => r.id !== row.id)); toast("Restriction removed"); }
    catch { toast("⚠ Couldn't delete — backend offline"); }
  };

  const openEdit = (row: Row) => setDialog({ mode: "edit", row, channelsText: row.channels.join(", ") });
  const openCreate = () => setDialog({ mode: "create", row: blank(), channelsText: "" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" />Rate Restrictions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} restrictions · min-stay · CTA/CTD · stop-sell</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Add restriction</Button>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">No restrictions yet. Click &ldquo;Add restriction&rdquo;.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(row => (
            <Card key={row.id} className="p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{row.kind}</p>
                {row.value && <Badge tone="brand">{row.value}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{row.roomType || "All room types"}</p>
              {(row.fromIso || row.toIso) && <p className="text-[11px] text-subtle-foreground tabular">{row.fromIso || "…"} → {row.toIso || "…"}</p>}
              {row.channels.length > 0 && <p className="text-[11px] text-subtle-foreground">{row.channels.join(" · ")}</p>}
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openEdit(row)}><Edit className="h-3 w-3" />Edit</Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}><Trash2 className="h-3 w-3" />Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">{dialog.mode === "edit" ? "Edit restriction" : "Add restriction"}</h3></div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Kind</Label><Select value={dialog.row.kind} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, kind: e.target.value } }))}>{KINDS.map(k => <option key={k}>{k}</option>)}</Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Value</Label><Input value={dialog.row.value} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, value: e.target.value } }))} className="h-9" placeholder="2 nights / Closed" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Room type</Label><Input value={dialog.row.roomType} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, roomType: e.target.value } }))} className="h-9" placeholder="All / Deluxe" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">From</Label><Input type="date" value={dialog.row.fromIso} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, fromIso: e.target.value } }))} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">To</Label><Input type="date" value={dialog.row.toIso} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, toIso: e.target.value } }))} className="h-9" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Channels (comma-separated)</Label><Input value={dialog.channelsText} onChange={e => setDialog(d => d && ({ ...d, channelsText: e.target.value }))} className="h-9" placeholder="Booking.com, Agoda" /></div>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" disabled={saving || !dialog.row.kind.trim() || !dialog.row.value.trim()} onClick={save}>{saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add restriction"}</Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Delete restriction</h3><p className="text-xs text-muted-foreground mt-0.5">Remove this {confirmDelete.kind} restriction?</p></div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30"><Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</Button></div>
          </Card>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into setup-view** (5 edits)

(a) `import { RateRestrictionsManager } from "./rate-restrictions-manager";`
(b) `SECTIONS` entry after `pricing-rules`:
```tsx
  { id: "rate-restrictions", group: "Rates & Packages" as SectionGroup,  label: "Rate Restrictions",        icon: Calendar,     hint: "Min-stay · CTA/CTD · stop-sell", accent: "accent" as const },
```
(`Calendar` is already imported in setup-view.) (c) add `"rate-restrictions"` to `CUSTOM_SECTIONS`; (d) add `"rate-restrictions": [],` to `INITIAL_DATA`; (e) render line after the `pricing-rules` render line:
```tsx
            {active === "rate-restrictions" && <RateRestrictionsManager onToast={showToast} />}
```

- [ ] **Step 3: Typecheck + lint + build** — same as Task 1 Step 3 (KEY GATE: confirms all three new `SectionId`s are exhaustively handled).

- [ ] **Step 4: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/rate-restrictions-manager.tsx" "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(setup): Rate Restrictions manager section"
```

---

## Self-Review

**Spec coverage:**
- Meal Plans manager + section → Task 1. ✓
- Pricing Rules manager + section → Task 2. ✓
- Rate Restrictions manager (incl. channels array ↔ comma text) + section → Task 3. ✓
- All three registered in `CUSTOM_SECTIONS` + `INITIAL_DATA` (crash guard) → each Task Step 2 (c)+(d). ✓
- Out-of-scope (Revenue editors untouched, no backend change) → respected. ✓

**Placeholder scan:** Complete component code for all three managers; exact 5-edit wiring each. No vague steps. ✓

**Type consistency:** Each `Row` type matches its resource's `ResourceController` RULES fields; `save` bodies send exactly those keys; required-field guards match `REQUIRED_ON_CREATE` (`code`+`name` for meal-plans, `name` for pricing-rules, `kind`+`value` for rate-restrictions). Icons `Utensils`/`Tag`/`Calendar` are already imported in `setup-view.tsx`. Each section appears in SECTIONS + CUSTOM_SECTIONS + INITIAL_DATA + render. ✓
