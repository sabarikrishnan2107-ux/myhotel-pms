"use client";
import * as React from "react";
import { Plus, Edit, Trash2, ConciergeBell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type Row = { id: number | string; kind: string; name: string; price: number; hint: string | null; active: boolean };
type Kind = "snacks" | "laundry" | "other";
const KIND_TABS: { id: Kind; label: string }[] = [
  { id: "snacks", label: "Snacks / Minibar" },
  { id: "laundry", label: "Laundry" },
  { id: "other", label: "Other services" },
];
const blank = (kind: Kind): Row => ({ id: "", kind, name: "", price: 0, hint: "", active: true });

export function ServiceItemsManager({ onToast }: { onToast?: (m: string) => void }) {
  const [activeKind, setActiveKind] = React.useState<Kind>("snacks");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: Row } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<Row | null>(null);
  const toast = (m: string) => onToast?.(m);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>("/service-items").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const visible = rows.filter(r => r.kind === activeKind);

  const save = async () => {
    if (!dialog) return;
    setSaving(true);
    const row = dialog.row;
    const body = { kind: row.kind, name: row.name.trim(), price: row.price, hint: row.hint?.trim() || null, active: row.active };
    try {
      if (dialog.mode === "edit") {
        const updated = await apiPut<Row>(`/service-items/${row.id}`, body);
        setRows(rs => rs.map(r => (r.id === row.id ? { ...r, ...updated } : r)));
        toast(`${body.name} updated`);
      } else {
        const created = await apiPost<Row>("/service-items", body);
        setRows(rs => [created, ...rs]);
        toast(`${body.name} added`);
      }
      setDialog(null);
    } catch {
      toast("⚠ Couldn't save — backend offline");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    setConfirmDelete(null);
    try {
      await apiDelete(`/service-items/${row.id}`);
      setRows(rs => rs.filter(r => r.id !== row.id));
      toast(`${row.name} removed`);
    } catch {
      toast("⚠ Couldn't delete — backend offline");
    }
  };

  const setActive = async (row: Row, next: boolean) => {
    setRows(rs => rs.map(r => (r.id === row.id ? { ...r, active: next } : r)));
    try {
      await apiPut(`/service-items/${row.id}`, { active: next });
    } catch {
      setRows(rs => rs.map(r => (r.id === row.id ? { ...r, active: !next } : r)));
      toast("⚠ Couldn't update — backend offline");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><ConciergeBell className="h-4 w-4 text-accent" />Room Service & Requests</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} items across snacks, laundry & other services</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ mode: "create", row: blank(activeKind) })}>
          <Plus className="h-4 w-4" />Add item
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {KIND_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveKind(t.id)}
            className={`h-9 rounded-md border text-xs font-medium transition-colors ${activeKind === t.id ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
          No items yet. Click &quot;Add item&quot; to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map(row => (
            <Card key={row.id} className="p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm leading-tight">{row.name}</p>
                <span className="text-sm font-semibold tabular text-brand shrink-0">{row.price === 0 ? "Free" : money(row.price)}</span>
              </div>
              {row.hint && <p className="text-xs text-muted-foreground italic">{row.hint}</p>}
              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Switch checked={row.active} onChange={next => setActive(row, next)} />
                  {row.active ? "Active" : "Hidden"}
                </label>
                <div className="flex gap-1.5">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDialog(null)}>
          <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">{dialog.mode === "edit" ? "Edit item" : "Add item"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{KIND_TABS.find(t => t.id === dialog.row.kind)?.label}</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={dialog.row.name} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, name: e.target.value } }))} className="h-9" placeholder="Bottled water (1L)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (₹, 0 = complimentary)</Label>
                <Input type="number" min={0} value={dialog.row.price} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, price: Number(e.target.value) } }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Note (optional)</Label>
                <Input value={dialog.row.hint ?? ""} onChange={e => setDialog(d => d && ({ ...d, row: { ...d.row, hint: e.target.value } }))} className="h-9" placeholder="+ 50% on items" />
              </div>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" disabled={saving || !dialog.row.name.trim()} onClick={save}>
                {saving ? "Saving…" : dialog.mode === "edit" ? "Save changes" : "Add item"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Delete item</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Remove &quot;{confirmDelete.name}&quot;? This can&apos;t be undone.</p>
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
