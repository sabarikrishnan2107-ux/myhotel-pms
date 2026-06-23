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
