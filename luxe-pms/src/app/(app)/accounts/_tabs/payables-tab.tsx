"use client";
import * as React from "react";
import { Plus, Wallet, AlertCircle, FileText, Receipt, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, NumberInput, Select } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";

// ---- Local type (replaces mock VendorBill import) ----
type VendorBill = {
  id: number;
  billNo: string;
  vendor: string;
  category: string | null;
  billDate: string;
  dueDate: string;
  taxableValue: number;
  gst: number;
  tdsRate: number;
  tdsAmount: number;
  netPayable: number;
  paid: number;
  status: "Draft" | "Approved" | "Partial" | "Paid";
};

// Derived display status (includes Overdue which is NOT stored)
type DisplayStatus = VendorBill["status"] | "Overdue";

function deriveStatus(b: VendorBill): DisplayStatus {
  if (b.status === "Paid") return "Paid";
  const balance = b.netPayable - b.paid;
  if (balance > 0 && b.dueDate < new Date().toISOString().slice(0, 10)) return "Overdue";
  return b.status;
}

// ---- New Bill Modal ----
function NewBillModal({ onClose, onSaved }: { onClose: () => void; onSaved: (b: VendorBill) => void }) {
  const [saving, setSaving] = React.useState(false);
  const [billNo, setBillNo] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [billDate, setBillDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [taxableValue, setTaxableValue] = React.useState(0);
  const [gst, setGst] = React.useState(0);
  const [tdsRate, setTdsRate] = React.useState(0);

  const tdsAmount = Math.round((taxableValue * tdsRate) / 100);
  const netPayable = taxableValue + gst - tdsAmount;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const valid = billNo.trim() !== "" && vendor.trim() !== "" && billDate !== "" && dueDate !== "";

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    try {
      const bill = await apiPost<VendorBill>("/vendor-bills", {
        billNo: billNo.trim(),
        vendor: vendor.trim(),
        category: category.trim() || null,
        billDate,
        dueDate,
        taxableValue,
        gst,
        tdsRate,
        tdsAmount,
        netPayable,
        paid: 0,
        status: "Approved",
      });
      onSaved(bill);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">New vendor bill</h3>
              <p className="text-xs text-muted-foreground">Enter bill details · TDS computed automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bill No. <span className="text-danger">*</span></Label>
              <Input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="e.g. INV-1234" className="h-9" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vendor <span className="text-danger">*</span></Label>
              <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. ABC Supplies" className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Linen, AMC" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">TDS Rate (%)</Label>
              <Select value={String(tdsRate)} onChange={e => setTdsRate(Number(e.target.value))} className="h-9">
                {[0, 1, 2, 5, 10].map(r => <option key={r} value={r}>{r}%</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bill date <span className="text-danger">*</span></Label>
              <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Due date <span className="text-danger">*</span></Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Taxable value (₹)</Label>
              <NumberInput value={taxableValue} onChange={setTaxableValue} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GST (₹)</Label>
              <NumberInput value={gst} onChange={setGst} className="h-9" />
            </div>
          </div>

          {/* Computed summary */}
          <div className="rounded-md bg-surface-sunken border border-border px-4 py-3 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">TDS ({tdsRate}%)</p>
              <p className="font-semibold tabular text-info">{money(tdsAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net payable</p>
              <p className="font-semibold tabular">{money(netPayable)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance</p>
              <p className="font-semibold tabular text-warning">{money(netPayable)}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 bg-surface-elevated border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={() => { void handleSave(); }} disabled={!valid || saving}>
            {saving ? "Saving…" : "Save bill"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ---- Record Payment Modal ----
function RecordPaymentModal({ bill, onClose, onSaved }: {
  bill: VendorBill;
  onClose: () => void;
  onSaved: (b: VendorBill) => void;
}) {
  const balance = bill.netPayable - bill.paid;
  const [amount, setAmount] = React.useState(balance);
  const [saving, setSaving] = React.useState(false);

  const newPaid = bill.paid + amount;
  const newStatus: VendorBill["status"] = newPaid >= bill.netPayable ? "Paid" : newPaid > 0 ? "Partial" : bill.status;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  async function handleRecord() {
    if (amount <= 0) return;
    setSaving(true);
    try {
      const updated = await apiPut<VendorBill>(`/vendor-bills/${bill.id}`, {
        paid: newPaid,
        status: newStatus,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-sm w-full p-0 overflow-hidden">
        <div className="px-5 py-4 bg-surface-elevated border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-md bg-success-soft text-success-soft-foreground inline-flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold">Record payment</h3>
              <p className="text-xs text-muted-foreground">{bill.vendor} · {bill.billNo}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="rounded-md bg-surface-sunken border border-border px-4 py-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Net payable</p>
              <p className="font-semibold tabular">{money(bill.netPayable)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Already paid</p>
              <p className="font-semibold tabular text-success">{money(bill.paid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Balance due</p>
              <p className="font-semibold tabular text-warning">{money(balance)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">New status</p>
              <p className="font-semibold">{newStatus}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Payment amount (₹)</Label>
            <NumberInput value={amount} onChange={setAmount} className="h-9" autoFocus />
          </div>
        </div>

        <div className="px-5 py-4 bg-surface-elevated border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="success" size="sm" onClick={() => { void handleRecord(); }} disabled={amount <= 0 || saving}>
            {saving ? "Saving…" : `Record ${money(amount)}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ===================== VENDOR BILLS / PAYABLES TAB =====================
export function PayablesTab({ onToast }: { onToast: (m: string) => void }) {
  const [bills, setBills] = React.useState<VendorBill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<"all" | DisplayStatus>("all");
  const [showNew, setShowNew] = React.useState(false);
  const [payingBill, setPayingBill] = React.useState<VendorBill | null>(null);

  // Fetch on mount
  React.useEffect(() => {
    apiGet<VendorBill[]>("/vendor-bills")
      .then(data => setBills(data))
      .catch(() => onToast("Failed to load vendor bills"))
      .finally(() => setLoading(false));
  }, [onToast]);

  // Derive display status for each bill
  const withStatus = bills.map(b => ({ ...b, _displayStatus: deriveStatus(b) }));

  const filtered = statusFilter === "all"
    ? withStatus
    : withStatus.filter(b => b._displayStatus === statusFilter);

  // KPIs from real data
  const totalOutstanding = bills.reduce((t, b) => t + Math.max(0, b.netPayable - b.paid), 0);
  const totalTDS = bills.reduce((t, b) => t + b.tdsAmount, 0);
  const overdueAmount = withStatus.filter(b => b._displayStatus === "Overdue").reduce((t, b) => t + (b.netPayable - b.paid), 0);

  const countByStatus = (s: DisplayStatus) => withStatus.filter(b => b._displayStatus === s).length;

  function handleBillSaved(bill: VendorBill) {
    setBills(prev => [bill, ...prev]);
    setShowNew(false);
    onToast(`Bill ${bill.billNo} from ${bill.vendor} added`);
  }

  function handlePaymentSaved(updated: VendorBill) {
    setBills(prev => prev.map(b => b.id === updated.id ? updated : b));
    setPayingBill(null);
    onToast(`Payment recorded · ${updated.vendor} · Status: ${updated.status}`);
  }

  return (
    <div className="space-y-5">
      {showNew && <NewBillModal onClose={() => setShowNew(false)} onSaved={handleBillSaved} />}
      {payingBill && <RecordPaymentModal bill={payingBill} onClose={() => setPayingBill(null)} onSaved={handlePaymentSaved} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total bills" value={bills.length} icon={FileText} accent="brand" />
        <KPICard label="Outstanding" value={money(totalOutstanding)} icon={Wallet} accent="warning" />
        <KPICard label="Overdue" value={money(overdueAmount)} icon={AlertCircle} accent={overdueAmount > 0 ? "danger" : "success"} />
        <KPICard label="TDS to deposit" value={money(totalTDS)} icon={Receipt} accent="info" hint="Quarterly 26Q" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "Draft", "Approved", "Partial", "Paid", "Overdue"] as ("all" | DisplayStatus)[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            {s === "all" ? "All" : s} · {s === "all" ? bills.length : countByStatus(s as DisplayStatus)}
          </button>
        ))}
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" />New bill
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading bills…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {bills.length === 0 ? "No vendor bills yet. Click \"New bill\" to add one." : `No bills with status "${statusFilter}".`}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Bill #</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Bill / Due</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3 text-right">Net Payable</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(b => {
                const balance = b.netPayable - b.paid;
                const ds = b._displayStatus;
                return (
                  <tr key={b.id} className={cn("hover:bg-surface-sunken/30", ds === "Overdue" && "bg-danger-soft/20")}>
                    <td className="px-4 py-3 font-mono tabular text-xs">{b.billNo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.vendor}</p>
                      {b.category && <Badge tone="neutral">{b.category}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="tabular text-muted-foreground">{formatDate(b.billDate)}</p>
                      <p className={cn("tabular font-medium", ds === "Overdue" && "text-danger")}>Due {formatDate(b.dueDate)}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{money(b.taxableValue)}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(b.gst)}</td>
                    <td className="px-4 py-3 text-right tabular text-info">{b.tdsAmount > 0 ? `${money(b.tdsAmount)} (${b.tdsRate}%)` : "—"}</td>
                    <td className="px-4 py-3 text-right tabular font-semibold">{money(b.netPayable)}</td>
                    <td className="px-4 py-3 text-right tabular text-success">{money(b.paid)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ds === "Paid" ? "success" : ds === "Overdue" ? "danger" : ds === "Partial" ? "warning" : ds === "Draft" ? "neutral" : "info"}>
                        {ds}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance > 0 && (
                        <Button size="sm" variant="success" onClick={() => setPayingBill(b)}>
                          Pay {money(balance)}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
