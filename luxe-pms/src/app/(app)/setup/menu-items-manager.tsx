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
          No menu items yet. Click &quot;Add item&quot; to create one.
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
              <p className="text-xs text-muted-foreground mt-0.5">Remove &quot;{confirmDelete.name}&quot; from the catalog? This can&apos;t be undone.</p>
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
