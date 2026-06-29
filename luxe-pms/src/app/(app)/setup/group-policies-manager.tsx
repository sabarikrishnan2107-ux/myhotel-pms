"use client";
import * as React from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiGet, apiPut } from "@/lib/api";

export type GroupPolicies = {
  depositPresets: number[];
  cancellationTiers: { upToDays: number; refundPct: number }[];
  discountTiers: { minRooms: number; discountPct: number }[];
};

export const DEFAULT_POLICIES: GroupPolicies = {
  depositPresets: [30, 50, 100],
  cancellationTiers: [
    { upToDays: 7,    refundPct: 25 },
    { upToDays: 14,   refundPct: 50 },
    { upToDays: 30,   refundPct: 75 },
    { upToDays: 9999, refundPct: 100 },
  ],
  discountTiers: [],
};

export function GroupPoliciesManager({ onToast }: { onToast?: (m: string) => void }) {
  const toast = (m: string) => onToast?.(m);
  const [saving, setSaving] = React.useState(false);
  const [policies, setPolicies] = React.useState<GroupPolicies>(DEFAULT_POLICIES);

  React.useEffect(() => {
    apiGet<Partial<GroupPolicies>>("/settings/group_policies")
      .then(d => {
        if (d && typeof d === "object") {
          setPolicies({
            depositPresets: Array.isArray(d.depositPresets) ? d.depositPresets : DEFAULT_POLICIES.depositPresets,
            cancellationTiers: Array.isArray(d.cancellationTiers) ? d.cancellationTiers : DEFAULT_POLICIES.cancellationTiers,
            discountTiers: Array.isArray(d.discountTiers) ? d.discountTiers : DEFAULT_POLICIES.discountTiers,
          });
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiPut("/settings/group_policies", policies);
      toast("Group policies saved");
    } catch {
      toast("⚠ Save failed — backend offline");
    } finally {
      setSaving(false);
    }
  };

  // ── Deposit presets ──────────────────────────────────────────────────────
  const [newPreset, setNewPreset] = React.useState("");
  const addPreset = () => {
    const v = parseInt(newPreset, 10);
    if (!v || v <= 0 || v > 100) return;
    if (policies.depositPresets.includes(v)) return;
    setPolicies(p => ({ ...p, depositPresets: [...p.depositPresets, v].sort((a, b) => a - b) }));
    setNewPreset("");
  };
  const removePreset = (v: number) =>
    setPolicies(p => ({ ...p, depositPresets: p.depositPresets.filter(x => x !== v) }));

  // ── Cancellation tiers ───────────────────────────────────────────────────
  const updateCancelTier = (i: number, key: "upToDays" | "refundPct", val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    setPolicies(p => {
      const tiers = [...p.cancellationTiers];
      tiers[i] = { ...tiers[i], [key]: n };
      return { ...p, cancellationTiers: tiers };
    });
  };
  const addCancelTier = () =>
    setPolicies(p => ({ ...p, cancellationTiers: [...p.cancellationTiers, { upToDays: 30, refundPct: 50 }] }));
  const removeCancelTier = (i: number) =>
    setPolicies(p => ({ ...p, cancellationTiers: p.cancellationTiers.filter((_, j) => j !== i) }));

  // ── Discount tiers ───────────────────────────────────────────────────────
  const updateDiscountTier = (i: number, key: "minRooms" | "discountPct", val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    setPolicies(p => {
      const tiers = [...p.discountTiers];
      tiers[i] = { ...tiers[i], [key]: n };
      return { ...p, discountTiers: tiers };
    });
  };
  const addDiscountTier = () =>
    setPolicies(p => ({ ...p, discountTiers: [...p.discountTiers, { minRooms: 10, discountPct: 5 }] }));
  const removeDiscountTier = (i: number) =>
    setPolicies(p => ({ ...p, discountTiers: p.discountTiers.filter((_, j) => j !== i) }));

  return (
    <div className="space-y-6">

      {/* ── Deposit presets ── */}
      <Card className="p-5 space-y-4">
        <div>
          <p className="font-semibold text-sm">Deposit presets</p>
          <p className="text-xs text-muted-foreground mt-0.5">Buttons shown on the New Group Booking payment step. "Custom / Instalments" is always added automatically.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {policies.depositPresets.map(v => (
            <div key={v} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-sunken px-2.5 h-8 text-sm font-medium">
              {v === 100 ? "Full (100%)" : `${v}%`}
              <button type="button" onClick={() => removePreset(v)} className="ml-1 text-muted-foreground hover:text-danger">×</button>
            </div>
          ))}
          <div className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 h-8 text-sm text-muted-foreground">
            Custom / Instalments
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-28">
            <Label>Add preset %</Label>
            <Input
              type="number"
              min={1} max={99}
              value={newPreset}
              onChange={e => setNewPreset(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPreset()}
              placeholder="e.g. 25"
            />
          </div>
          <Button type="button" variant="outline" onClick={addPreset}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
      </Card>

      {/* ── Cancellation tiers ── */}
      <Card className="p-5 space-y-4">
        <div>
          <p className="font-semibold text-sm">Cancellation refund policy</p>
          <p className="text-xs text-muted-foreground mt-0.5">Refund % applied based on how many days before arrival the group cancels. Stays already started always get 0% refund.</p>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
            <span>If cancelled within X days of arrival</span>
            <span>Refund %</span>
            <span />
          </div>
          {policies.cancellationTiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number" min={1}
                  value={tier.upToDays >= 9999 ? "" : tier.upToDays}
                  placeholder="∞ (any)"
                  onChange={e => updateCancelTier(i, "upToDays", e.target.value || "9999")}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground shrink-0">days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number" min={0} max={100}
                  value={tier.refundPct}
                  onChange={e => updateCancelTier(i, "refundPct", e.target.value)}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground shrink-0">%</span>
              </div>
              <button type="button" onClick={() => removeCancelTier(i)} className="text-muted-foreground hover:text-danger p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addCancelTier}>
          <Plus className="h-3.5 w-3.5" />Add tier
        </Button>
        <p className="text-xs text-muted-foreground">Tiers are evaluated in order — first match wins. Set the last tier's days to blank (∞) for the free-cancellation window.</p>
      </Card>

      {/* ── Volume discount tiers ── */}
      <Card className="p-5 space-y-4">
        <div>
          <p className="font-semibold text-sm">Volume discount tiers</p>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-applied when the room block hits the threshold. The highest matching tier wins. Discount is off the room type's base tariff.</p>
        </div>
        {policies.discountTiers.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No tiers configured — all group rates use the rate plan discount only.</p>
        )}
        <div className="space-y-2">
          {policies.discountTiers.length > 0 && (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
              <span>Min rooms</span>
              <span>Discount %</span>
              <span />
            </div>
          )}
          {policies.discountTiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number" min={1}
                  value={tier.minRooms}
                  onChange={e => updateDiscountTier(i, "minRooms", e.target.value)}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground shrink-0">rooms</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number" min={0} max={100}
                  value={tier.discountPct}
                  onChange={e => updateDiscountTier(i, "discountPct", e.target.value)}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground shrink-0">%</span>
              </div>
              <button type="button" onClick={() => removeDiscountTier(i)} className="text-muted-foreground hover:text-danger p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addDiscountTier}>
          <Plus className="h-3.5 w-3.5" />Add tier
        </Button>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} variant="success">
          <Save className="h-4 w-4" />{saving ? "Saving…" : "Save Group Policies"}
        </Button>
      </div>
    </div>
  );
}
