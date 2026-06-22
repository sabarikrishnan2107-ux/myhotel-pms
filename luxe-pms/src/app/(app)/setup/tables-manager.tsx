"use client";
import * as React from "react";
import { Plus, Edit, Trash2, Armchair, Rows3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

type PosTable = {
  id: number | string;
  code: string;
  seats: number;
  zone?: string | null;
  status?: string | null;
};

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "accent";
const STATUS_TONE: Record<string, Tone> = {
  free: "success", seated: "info", ordering: "warning", billing: "accent", dirty: "neutral",
};
const tone = (s?: string | null): Tone => STATUS_TONE[(s ?? "free").toLowerCase()] ?? "neutral";

export function TablesManager({ onToast }: { onToast?: (m: string) => void }) {
  const [rows, setRows] = React.useState<PosTable[]>([]);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; row: PosTable | null } | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<PosTable | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<PosTable[]>("/pos-tables").then(r => { if (!cancelled && Array.isArray(r)) setRows(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toast = (m: string) => onToast?.(m);

  // Existing zones for the datalist suggestions.
  const zones = React.useMemo(
    () => Array.from(new Set(rows.map(r => (r.zone ?? "").trim()).filter(Boolean))).sort(),
    [rows],
  );
  const totalSeats = rows.reduce((s, r) => s + (Number(r.seats) || 0), 0);

  // Group tables by zone for display.
  const grouped = React.useMemo(() => {
    const map = new Map<string, PosTable[]>();
    for (const r of rows) {
      const z = (r.zone ?? "").trim() || "Unzoned";
      (map.get(z) ?? map.set(z, []).get(z)!).push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const save = async (payload: { code: string; seats: number; zone: string }) => {
    setSaving(true);
    try {
      const body = { code: payload.code, seats: payload.seats, zone: payload.zone || null };
      if (dialog?.mode === "edit" && dialog.row) {
        const updated = await apiPut<PosTable>(`/pos-tables/${dialog.row.id}`, body);
        setRows(rs => rs.map(r => (r.id === dialog.row!.id ? { ...r, ...updated } : r)));
        toast(`Table ${payload.code} updated`);
      } else {
        const created = await apiPost<PosTable>("/pos-tables", { ...body, status: "free" });
        setRows(rs => [...rs, created]);
        toast(`Table ${payload.code} added`);
      }
      setDialog(null);
    } catch {
      toast("⚠ Couldn't save table — backend offline");
    } finally {
      setSaving(false);
    }
  };

  const bulkSave = async (b: { prefix: string; start: number; count: number; seats: number; zone: string }) => {
    setSaving(true);
    const existing = new Set(rows.map(r => r.code));
    const created: PosTable[] = [];
    try {
      for (let i = 0; i < b.count; i++) {
        const code = `${b.prefix}${b.start + i}`;
        if (existing.has(code)) continue; // skip duplicates
        const row = await apiPost<PosTable>("/pos-tables", { code, seats: b.seats, zone: b.zone || null, status: "free" });
        created.push(row);
      }
      setRows(rs => [...rs, ...created]);
      setBulkOpen(false);
      toast(created.length ? `Added ${created.length} table${created.length > 1 ? "s" : ""}` : "No new tables (all codes already exist)");
    } catch {
      if (created.length) setRows(rs => [...rs, ...created]);
      toast("⚠ Bulk add stopped — backend offline");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: PosTable) => {
    setConfirmDelete(null);
    try {
      await apiDelete(`/pos-tables/${row.id}`);
      setRows(rs => rs.filter(r => r.id !== row.id));
      toast(`Table ${row.code} removed`);
    } catch {
      toast("⚠ Couldn't delete table — backend offline");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold inline-flex items-center gap-2"><Armchair className="h-4 w-4 text-info" />Restaurant Tables</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} tables · {totalSeats} seats · shown live on the POS floor map</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Rows3 className="h-4 w-4" />Bulk add</Button>
          <Button size="sm" onClick={() => setDialog({ mode: "create", row: null })}><Plus className="h-4 w-4" />Add table</Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
          No tables yet. Click &quot;Add table&quot; or &quot;Bulk add&quot; to create them.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([zoneName, list]) => (
            <div key={zoneName}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{zoneName}</span>
                <span className="text-[10px] text-subtle-foreground">{list.length} tables</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {list.map(row => (
                  <Card key={row.id} className="p-3 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm">{row.code}</span>
                      <Badge tone={tone(row.status)}>{row.status ?? "free"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{row.seats} seats</p>
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setDialog({ mode: "edit", row })}>
                        <Edit className="h-3 w-3" />Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] hover:border-danger hover:text-danger" onClick={() => setConfirmDelete(row)}>
                        <Trash2 className="h-3 w-3" />Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <TableDialog
          mode={dialog.mode}
          initial={dialog.row}
          zones={zones}
          saving={saving}
          onClose={() => setDialog(null)}
          onSave={save}
        />
      )}

      {bulkOpen && (
        <BulkDialog zones={zones} saving={saving} onClose={() => setBulkOpen(false)} onSave={bulkSave} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Delete table</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Remove table &quot;{confirmDelete.code}&quot;? This can&apos;t be undone.</p>
            </div>
            <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => remove(confirmDelete)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function TableDialog({ mode, initial, zones, saving, onClose, onSave }: {
  mode: "create" | "edit";
  initial: PosTable | null;
  zones: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (v: { code: string; seats: number; zone: string }) => void;
}) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [seats, setSeats] = React.useState(initial?.seats ?? 4);
  const [zone, setZone] = React.useState(initial?.zone ?? "");
  const valid = code.trim().length > 0 && seats >= 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">{mode === "edit" ? "Edit table" : "Add table"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Appears on the POS floor map immediately.</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Table code</Label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. T21" className="h-9" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Seats</Label>
              <Input type="number" min={1} value={seats} onChange={e => setSeats(Math.max(1, Number(e.target.value)))} className="h-9 tabular" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zone</Label>
              <Input list="tables-zone-list" value={zone ?? ""} onChange={e => setZone(e.target.value)} placeholder="e.g. Main Hall" className="h-9" />
              <datalist id="tables-zone-list">{zones.map(z => <option key={z} value={z} />)}</datalist>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid || saving} onClick={() => onSave({ code: code.trim(), seats, zone: (zone ?? "").trim() })}>
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add table"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BulkDialog({ zones, saving, onClose, onSave }: {
  zones: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (b: { prefix: string; start: number; count: number; seats: number; zone: string }) => void;
}) {
  const [prefix, setPrefix] = React.useState("T");
  const [start, setStart] = React.useState(1);
  const [count, setCount] = React.useState(5);
  const [seats, setSeats] = React.useState(4);
  const [zone, setZone] = React.useState("");
  const valid = count >= 1 && count <= 100 && seats >= 1;
  const preview = `${prefix}${start} … ${prefix}${start + Math.max(0, count - 1)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="max-w-md w-full p-0 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Bulk add tables</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Creates a range of tables at once. Existing codes are skipped.</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prefix</Label>
              <Input value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="T" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start #</Label>
              <Input type="number" min={0} value={start} onChange={e => setStart(Math.max(0, Number(e.target.value)))} className="h-9 tabular" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Count</Label>
              <Input type="number" min={1} max={100} value={count} onChange={e => setCount(Math.max(1, Math.min(100, Number(e.target.value))))} className="h-9 tabular" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Seats each</Label>
              <Input type="number" min={1} value={seats} onChange={e => setSeats(Math.max(1, Number(e.target.value)))} className="h-9 tabular" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zone</Label>
              <Input list="tables-zone-list" value={zone} onChange={e => setZone(e.target.value)} placeholder="e.g. Patio" className="h-9" />
              <datalist id="tables-zone-list">{zones.map(z => <option key={z} value={z} />)}</datalist>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Will create: <span className="font-medium text-foreground">{count}</span> tables · <span className="tabular">{preview}</span></p>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2 bg-surface-sunken/30">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid || saving} onClick={() => onSave({ prefix: prefix.trim(), start, count, seats, zone: zone.trim() })}>
            {saving ? "Adding…" : `Add ${count} tables`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
