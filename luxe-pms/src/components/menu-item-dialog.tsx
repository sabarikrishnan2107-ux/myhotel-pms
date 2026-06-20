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
