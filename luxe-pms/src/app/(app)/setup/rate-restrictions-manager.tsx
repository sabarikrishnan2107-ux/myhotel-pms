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
