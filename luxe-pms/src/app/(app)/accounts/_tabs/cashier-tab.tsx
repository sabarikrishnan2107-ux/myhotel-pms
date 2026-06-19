"use client";
import * as React from "react";
import {
  Plus, X, Wallet, Receipt, TrendingUp, AlertCircle, Search, CheckCircle2,
  Lock, ShieldCheck, Eye, Printer, Minus, ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { money, cn, formatDate } from "@/lib/utils";
import { CASHIER_SHIFTS, type CashierShift } from "../_data";

// ===================== CASHIER SUMMARY TAB =====================
const DENOMINATIONS = [
  { value: 2000, label: "₹2000" }, { value: 500, label: "₹500" },
  { value: 200,  label: "₹200" },  { value: 100, label: "₹100" },
  { value: 50,   label: "₹50" },   { value: 20,  label: "₹20" },
  { value: 10,   label: "₹10" },   { value: 5,   label: "₹5" },
  { value: 2,    label: "₹2" },    { value: 1,   label: "₹1" },
];
const VARIANCE_REASONS = [
  "Cashier error", "Refund mismatch", "Change error",
  "Counterfeit note", "Tip not recorded", "Other",
];
const CASHIER_ROSTER = ["Khalid R.", "Priya M.", "Aman S.", "Reena T.", "Vikram J."];
const VERIFIERS = ["Manager · Rohit K.", "Manager · Anjali S.", "Accounts · CA Sharma"];

type DateRange = "today" | "yesterday" | "week" | "all";

export function CashierTab({ onToast }: { onToast: (m: string) => void }) {
  const [shifts, setShifts] = React.useState<CashierShift[]>(CASHIER_SHIFTS);
  const [dateRange, setDateRange] = React.useState<DateRange>("today");
  const [cashierFilter, setCashierFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | CashierShift["status"]>("all");
  const [search, setSearch] = React.useState("");

  const [openNewShift, setOpenNewShift] = React.useState(false);
  const [closeShiftFor, setCloseShiftFor] = React.useState<CashierShift | null>(null);
  const [verifyShiftFor, setVerifyShiftFor] = React.useState<CashierShift | null>(null);
  const [detailShift, setDetailShift] = React.useState<CashierShift | null>(null);

  // Demo "today" matches the seed-data dates
  const TODAY_ISO = "2026-05-24";
  const YDAY_ISO  = "2026-05-23";

  const filtered = React.useMemo(() => {
    return shifts.filter(s => {
      if (cashierFilter !== "all" && s.cashier !== cashierFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search && !`${s.shiftNo} ${s.cashier}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateRange === "today")     return s.date === TODAY_ISO;
      if (dateRange === "yesterday") return s.date === YDAY_ISO;
      if (dateRange === "week")      return s.date >= "2026-05-18";
      return true;
    });
  }, [shifts, dateRange, cashierFilter, statusFilter, search]);

  const totalCash = filtered.reduce((t, s) => t + s.cashReceived, 0);
  const totalCard = filtered.reduce((t, s) => t + s.cardReceived, 0);
  const totalUpi  = filtered.reduce((t, s) => t + s.upiReceived, 0);
  const totalReceipts = totalCash + totalCard + totalUpi;
  const grossVariance = filtered.reduce((t, s) => t + Math.abs(s.variance), 0);
  const flaggedCount  = filtered.filter(s => s.variance !== 0 && s.status !== "Open").length;
  const activeShifts  = shifts.filter(s => s.status === "Open");

  const cashiers = Array.from(new Set(shifts.map(s => s.cashier)));
  const activeFilters = (cashierFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  const handleOpen = (cashier: string, opening: number) => {
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    const next: CashierShift = {
      id: `cs-${shifts.length + 1}-${cashier.replace(/\s/g, "")}`,
      shiftNo: `#${4220 + shifts.length + 1}`,
      cashier, date: TODAY_ISO,
      startTime: nowTime, endTime: "—",
      opening, cashReceived: 0, cardReceived: 0, upiReceived: 0,
      expensesPaid: 0, closing: 0, expectedClosing: opening,
      variance: 0, status: "Open",
    };
    setShifts(prev => [next, ...prev]);
    setOpenNewShift(false);
    onToast(`Shift ${next.shiftNo} opened · ${cashier} · float ${money(opening)}`);
  };

  const handleClose = (shift: CashierShift, counted: number, varReason: string, varNotes: string, handover: string) => {
    const nowTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    setShifts(prev => prev.map(s => s.id === shift.id ? {
      ...s, status: "Closed" as const,
      closing: counted, variance: counted - s.expectedClosing,
      endTime: nowTime, varianceReason: varReason, varianceNotes: varNotes, handoverNotes: handover,
    } : s));
    setCloseShiftFor(null);
    onToast(`Shift ${shift.shiftNo} closed · ${money(counted)} counted${counted - shift.expectedClosing !== 0 ? ` · variance ${money(counted - shift.expectedClosing)}` : ""}`);
  };

  const handleVerify = (shift: CashierShift, verifiedBy: string, notes: string) => {
    setShifts(prev => prev.map(s => s.id === shift.id ? {
      ...s, status: "Verified" as const, verifiedBy, verifiedAt: new Date().toISOString(),
      varianceNotes: notes ? `${s.varianceNotes || ""}${s.varianceNotes ? " · " : ""}Verified note: ${notes}` : s.varianceNotes,
    } : s));
    setVerifyShiftFor(null);
    onToast(`Shift ${shift.shiftNo} verified by ${verifiedBy}`);
  };

  return (
    <div className="space-y-5">
      {/* Active shift hero */}
      {activeShifts.length > 0 && (
        <Card className="p-4 border-success/40 bg-linear-to-r from-success-soft/40 via-surface to-surface ring-1 ring-success/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-success font-semibold">
                  {activeShifts.length} shift{activeShifts.length === 1 ? "" : "s"} currently live on the floor
                </p>
                <p className="text-sm font-medium mt-0.5">
                  {activeShifts.map(s => (
                    <span key={s.id} className="inline-flex items-center gap-1 mr-3">
                      <strong>{s.cashier}</strong>
                      <span className="text-muted-foreground tabular text-xs">({s.shiftNo} · since {s.startTime})</span>
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {activeShifts.map(s => (
                <Button key={s.id} variant="outline" size="sm" onClick={() => setCloseShiftFor(s)}>
                  <Lock className="h-3.5 w-3.5" />Close {s.shiftNo}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Cash collected" value={money(totalCash)} icon={Wallet} accent="brand" hint={dateRange} />
        <KPICard label="Card collected" value={money(totalCard)} icon={Receipt} accent="info" />
        <KPICard label="UPI collected"  value={money(totalUpi)}  icon={Receipt} accent="success" />
        <KPICard label="Total receipts" value={money(totalReceipts)} icon={TrendingUp} accent="accent" hint={`${filtered.length} shift${filtered.length === 1 ? "" : "s"}`} />
        <KPICard
          label="Gross variance"
          value={money(grossVariance)}
          icon={AlertCircle}
          accent={grossVariance === 0 ? "success" : grossVariance < 1000 ? "warning" : "danger"}
          hint={`${flaggedCount} flagged`}
        />
      </div>

      {/* Filter bar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "yesterday", "week", "all"] as DateRange[]).map(d => (
            <button key={d} onClick={() => setDateRange(d)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
              dateRange === d ? "bg-foreground text-background border-foreground shadow-xs" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>{d}</button>
          ))}
          <div className="h-6 w-px bg-border mx-1" />
          <Select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)} className="h-8 w-auto text-xs">
            <option value="all">All cashiers</option>
            {cashiers.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-8 w-auto text-xs">
            <option value="all">All statuses</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="Verified">Verified</option>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Shift # or cashier" className="h-8 pl-8 w-44 text-xs" />
          </div>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setCashierFilter("all"); setStatusFilter("all"); setSearch(""); }}>
              <X className="h-3 w-3" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular hidden sm:block">
            <span className="font-medium text-foreground">{filtered.length}</span> of {shifts.length}
          </p>
          <Button size="sm" variant="outline" onClick={() => { window.print(); onToast("Shift book report printed"); }}>
            <Printer className="h-3.5 w-3.5" />Print
          </Button>
          <Button size="sm" onClick={() => setOpenNewShift(true)}>
            <Plus className="h-3.5 w-3.5" />Open shift
          </Button>
        </div>
      </Card>

      {/* Shift table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No shifts match these filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try a wider date range or clear filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Shift / Cashier</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Receipts</th>
                  <th className="px-4 py-3 text-right">Expenses</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Counted</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => {
                  const totalRecv = s.cashReceived + s.cardReceived + s.upiReceived;
                  return (
                    <tr key={s.id} className={cn(
                      "hover:bg-surface-sunken/30 transition-colors",
                      s.status === "Open" && "bg-success-soft/10",
                      s.variance !== 0 && s.status === "Closed" && "bg-warning-soft/15"
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            s.status === "Open" ? "bg-success animate-pulse" :
                            s.status === "Closed" ? "bg-warning" : "bg-brand"
                          )} />
                          <div>
                            <p className="font-medium text-sm">{s.cashier}</p>
                            <p className="text-[11px] text-muted-foreground font-mono tabular">{s.shiftNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="text-muted-foreground tabular">{formatDate(s.date)}</p>
                        <p className="font-medium tabular">{s.startTime} → {s.endTime}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{money(s.opening)}</td>
                      <td className="px-4 py-3 text-right tabular">
                        <p className="font-medium">{money(totalRecv)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {money(s.cashReceived)} · {money(s.cardReceived)} · {money(s.upiReceived)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular">{s.expensesPaid > 0 ? <span className="text-danger">−{money(s.expensesPaid)}</span> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(s.expectedClosing)}</td>
                      <td className="px-4 py-3 text-right tabular font-semibold">
                        {s.status === "Open" ? <span className="text-muted-foreground text-xs italic">pending</span> : money(s.closing)}
                      </td>
                      <td className={cn(
                        "px-4 py-3 text-right tabular font-semibold",
                        s.status === "Open" ? "text-muted-foreground" :
                        s.variance < 0 ? "text-danger" :
                        s.variance > 0 ? "text-warning" : "text-success"
                      )}>
                        {s.status === "Open" ? "—" :
                         s.variance === 0 ? <CheckCircle2 className="h-4 w-4 inline text-success" /> :
                         (s.variance > 0 ? "+" : "") + money(s.variance)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.status === "Open" ? "success" : s.status === "Closed" ? "warning" : "brand"}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailShift(s)}
                            className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors"
                            title="View shift report"
                          ><Eye className="h-3.5 w-3.5" /></button>
                          {s.status === "Open" && (
                            <Button size="sm" variant="outline" onClick={() => setCloseShiftFor(s)}>
                              <Lock className="h-3.5 w-3.5" />Close
                            </Button>
                          )}
                          {s.status === "Closed" && (
                            <Button size="sm" variant="success" onClick={() => setVerifyShiftFor(s)}>
                              <ShieldCheck className="h-3.5 w-3.5" />Verify
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals & drawer */}
      {openNewShift && <OpenShiftModal onClose={() => setOpenNewShift(false)} onSave={handleOpen} />}
      {closeShiftFor && <CloseShiftModal shift={closeShiftFor} onClose={() => setCloseShiftFor(null)} onSave={handleClose} />}
      {verifyShiftFor && <VerifyShiftModal shift={verifyShiftFor} onClose={() => setVerifyShiftFor(null)} onSave={handleVerify} />}
      {detailShift && (
        <ShiftDetailDrawer
          shift={detailShift}
          onClose={() => setDetailShift(null)}
          onPrint={() => onToast(`Shift ${detailShift.shiftNo} report printed`)}
        />
      )}
    </div>
  );
}

// ===================== OPEN SHIFT MODAL =====================
function OpenShiftModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (cashier: string, opening: number) => void;
}) {
  const [cashier, setCashier] = React.useState(CASHIER_ROSTER[0]);
  const [opening, setOpening] = React.useState(50000);
  const nowDisplay = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-success-soft text-success inline-flex items-center justify-center"><Plus className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Open new shift</h3>
              <p className="text-xs text-muted-foreground">Cashier signs for opening float</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Cashier on duty</Label>
            <div className="flex flex-wrap gap-1.5">
              {CASHIER_ROSTER.map(c => (
                <button key={c} type="button" onClick={() => setCashier(c)} className={cn(
                  "h-9 px-3 rounded-md text-sm font-medium border transition-colors",
                  cashier === c ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{c}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Opening float (cash in drawer)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" value={opening} onChange={e => setOpening(Math.max(0, Number(e.target.value) || 0))} className="h-11 pl-7 tabular text-lg font-semibold" min={0} />
            </div>
            <div className="flex gap-1.5 pt-0.5">
              {[20000, 50000, 100000].map(amt => (
                <button key={amt} type="button" onClick={() => setOpening(amt)} className={cn(
                  "h-7 px-2.5 rounded-md border text-xs transition-colors tabular",
                  opening === amt ? "border-brand bg-brand-soft text-brand-soft-foreground" : "border-border hover:bg-surface-sunken"
                )}>
                  {money(amt)}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md bg-info-soft/30 border border-info/20 p-3 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <p>Start time will be <strong className="tabular">{nowDisplay}</strong>. Float is logged against {cashier}&apos;s name and must be returned at shift close.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(cashier, opening)} disabled={opening <= 0}>
            <Plus className="h-3.5 w-3.5" />Open shift
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== CLOSE SHIFT MODAL =====================
function CloseShiftModal({ shift, onClose, onSave }: {
  shift: CashierShift;
  onClose: () => void;
  onSave: (shift: CashierShift, counted: number, varReason: string, varNotes: string, handover: string) => void;
}) {
  const [counts, setCounts] = React.useState<Record<number, number>>({});
  const [varReason, setVarReason] = React.useState("");
  const [varNotes, setVarNotes] = React.useState("");
  const [handover, setHandover] = React.useState("");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const counted = DENOMINATIONS.reduce((t, d) => t + (counts[d.value] || 0) * d.value, 0);
  const variance = counted - shift.expectedClosing;
  const totalNotes = DENOMINATIONS.reduce((t, d) => t + (counts[d.value] || 0), 0);

  const bump = (denom: number, delta: number) =>
    setCounts(c => ({ ...c, [denom]: Math.max(0, (c[denom] || 0) + delta) }));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Lock className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Close shift {shift.shiftNo}</h3>
              <p className="text-xs text-muted-foreground">{shift.cashier} · started {shift.startTime} · count cash drawer</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Expected breakdown */}
          <Card className="p-3 bg-info-soft/15 border-info/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Expected closing waterfall</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><p className="text-muted-foreground">Opening float</p><p className="font-semibold tabular">{money(shift.opening)}</p></div>
              <div><p className="text-muted-foreground">+ Cash receipts</p><p className="font-semibold tabular text-success">{money(shift.cashReceived)}</p></div>
              <div><p className="text-muted-foreground">− Expenses paid out</p><p className="font-semibold tabular text-danger">{money(shift.expensesPaid)}</p></div>
              <div><p className="text-muted-foreground">= Expected</p><p className="font-bold tabular text-info text-base">{money(shift.expectedClosing)}</p></div>
            </div>
          </Card>

          {/* Denomination grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Physical cash count</p>
              <p className="text-[11px] text-muted-foreground">{totalNotes} note{totalNotes === 1 ? "" : "s"}/coin{totalNotes === 1 ? "" : "s"} counted</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {DENOMINATIONS.map(d => {
                const qty = counts[d.value] || 0;
                const sub = qty * d.value;
                return (
                  <div key={d.value} className={cn("rounded-md border p-2.5 transition-colors", qty > 0 ? "border-brand/40 bg-brand-soft/15" : "border-border")}>
                    <p className="text-[11px] font-bold tracking-wider">{d.label}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <button type="button" onClick={() => bump(d.value, -1)} disabled={qty === 0}
                        className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken disabled:opacity-30 inline-flex items-center justify-center">
                        <Minus className="h-3 w-3" />
                      </button>
                      <Input type="number" min={0} value={qty || ""} placeholder="0"
                        onChange={e => setCounts(c => ({ ...c, [d.value]: Math.max(0, Number(e.target.value) || 0) }))}
                        className="h-7 tabular text-center text-sm px-1" />
                      <button type="button" onClick={() => bump(d.value, 1)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[10px] tabular text-muted-foreground text-right mt-1 truncate">{sub > 0 ? money(sub) : "—"}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Counted total + variance */}
          <Card className={cn(
            "p-4 border-2 transition-colors",
            counted === 0 ? "border-border bg-surface-sunken/20" :
            variance === 0 ? "border-success/40 bg-success-soft/20" :
            Math.abs(variance) < 500 ? "border-warning/40 bg-warning-soft/20" :
            "border-danger/40 bg-danger-soft/20"
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Counted total</p>
                <p className="text-2xl font-bold tabular">{money(counted)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Variance vs expected</p>
                <p className={cn(
                  "text-2xl font-bold tabular flex items-center justify-end gap-1",
                  counted === 0 ? "text-muted-foreground" :
                  variance < 0 ? "text-danger" : variance > 0 ? "text-warning" : "text-success"
                )}>
                  {counted === 0 ? "—" :
                   variance === 0 ? <><CheckCircle2 className="h-5 w-5" /> Tally</> :
                   <>{variance > 0 ? "+" : ""}{money(variance)}</>}
                </p>
              </div>
            </div>
          </Card>

          {/* Variance reason if mismatch */}
          {variance !== 0 && counted > 0 && (
            <div className="space-y-2 p-3 rounded-md bg-warning-soft/15 border border-warning/30">
              <p className="text-xs font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" />Variance reason required</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIANCE_REASONS.map(r => (
                  <button key={r} type="button" onClick={() => setVarReason(r)} className={cn(
                    "h-7 px-2.5 rounded-full text-xs border transition-colors",
                    varReason === r ? "bg-warning text-white border-warning" : "border-border hover:bg-surface-sunken"
                  )}>{r}</button>
                ))}
              </div>
              <textarea value={varNotes} onChange={e => setVarNotes(e.target.value)} placeholder="Explanation / corrective action…"
                rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
            </div>
          )}

          {/* Handover note */}
          <div className="space-y-1.5">
            <Label className="text-xs"><ClipboardList className="h-3 w-3 inline mr-1" />Handover note for next shift (optional)</Label>
            <textarea value={handover} onChange={e => setHandover(e.target.value)}
              placeholder="e.g. ₹2000 reserved for Room 412 deposit refund · Card terminal slow · …"
              rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <p className="text-xs text-muted-foreground">
            Counted <span className="tabular font-medium text-foreground">{money(counted)}</span> vs expected <span className="tabular font-medium text-foreground">{money(shift.expectedClosing)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              variant="success"
              disabled={counted === 0 || (variance !== 0 && !varReason)}
              onClick={() => onSave(shift, counted, varReason, varNotes, handover)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />Confirm close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== VERIFY SHIFT MODAL =====================
function VerifyShiftModal({ shift, onClose, onSave }: {
  shift: CashierShift;
  onClose: () => void;
  onSave: (shift: CashierShift, verifiedBy: string, notes: string) => void;
}) {
  const [verifier, setVerifier] = React.useState(VERIFIERS[0]);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const totalRecv = shift.cashReceived + shift.cardReceived + shift.upiReceived;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Verify shift {shift.shiftNo}</h3>
              <p className="text-xs text-muted-foreground">Manager / accounts sign-off</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Card className="p-3 bg-surface-sunken/30">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-muted-foreground">Cashier</p><p className="font-medium">{shift.cashier}</p></div>
              <div><p className="text-muted-foreground">Window</p><p className="font-medium tabular">{shift.startTime}–{shift.endTime}</p></div>
              <div><p className="text-muted-foreground">Receipts</p><p className="font-medium tabular">{money(totalRecv)}</p></div>
            </div>
            {shift.variance !== 0 && (
              <div className={cn(
                "mt-2 pt-2 border-t border-border flex items-center justify-between",
                shift.variance < 0 ? "text-danger" : "text-warning"
              )}>
                <span className="text-xs font-medium inline-flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Variance flagged · {shift.varianceReason || "no reason"}</span>
                <span className="text-xs tabular font-bold">{shift.variance > 0 ? "+" : ""}{money(shift.variance)}</span>
              </div>
            )}
            {shift.varianceNotes && (
              <p className="mt-1.5 text-[11px] text-muted-foreground italic">&ldquo;{shift.varianceNotes}&rdquo;</p>
            )}
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs">Verified by</Label>
            <Select value={verifier} onChange={e => setVerifier(e.target.value)} className="h-9">
              {VERIFIERS.map(v => <option key={v}>{v}</option>)}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Verification notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={shift.variance !== 0 ? "Variance investigated — explain resolution / action taken" : "All tallies match — no action needed"}
              rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={() => onSave(shift, verifier, notes)}>
            <ShieldCheck className="h-3.5 w-3.5" />Verify shift
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== SHIFT DETAIL DRAWER =====================
function ShiftDetailDrawer({ shift, onClose, onPrint }: {
  shift: CashierShift;
  onClose: () => void;
  onPrint: () => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const totalRecv = shift.cashReceived + shift.cardReceived + shift.upiReceived;
  // Mock transactions for the drawer
  const SAMPLE_TXNS = [
    { time: "08:15", ref: "RCP-2026-100240", type: "Folio settle · BK100240",   mode: "Card", amt:  14500 },
    { time: "10:42", ref: "RCP-2026-100241", type: "Walk-in advance · WI-1182", mode: "Cash", amt:   8000 },
    { time: "12:08", ref: "PV-2026-0419",    type: "Expense · Vegetable mkt",   mode: "Cash (out)", amt: -2500 },
    { time: "13:25", ref: "RCP-2026-100244", type: "F&B order · Room 408",      mode: "UPI",  amt:   1650 },
    { time: "14:11", ref: "RCP-2026-100246", type: "Folio settle · BK100225",   mode: "Card", amt:  22400 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shift report</p>
            <h3 className="font-semibold truncate">{shift.shiftNo} · {shift.cashier}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onPrint}><Printer className="h-3.5 w-3.5" />Print</Button>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Summary */}
          <Card className="p-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <Badge tone={shift.status === "Open" ? "success" : shift.status === "Closed" ? "warning" : "brand"}>{shift.status}</Badge>
                <p className="mt-2 text-sm font-medium">{formatDate(shift.date)}</p>
                <p className="text-xs text-muted-foreground tabular">{shift.startTime} → {shift.endTime}</p>
                {shift.verifiedBy && (
                  <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-brand" />by {shift.verifiedBy}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net receipts</p>
                <p className="text-2xl font-bold tabular">{money(totalRecv)}</p>
              </div>
            </div>
          </Card>

          {/* Receipts breakdown */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Receipts</p>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Cash</p>
                <p className="font-bold tabular text-sm mt-0.5">{money(shift.cashReceived)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Card</p>
                <p className="font-bold tabular text-sm mt-0.5">{money(shift.cardReceived)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">UPI</p>
                <p className="font-bold tabular text-sm mt-0.5">{money(shift.upiReceived)}</p>
              </Card>
            </div>
          </div>

          {/* Cash waterfall */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Cash drawer waterfall</p>
            <Card className="p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Opening float</span><span className="tabular">{money(shift.opening)}</span></div>
              <div className="flex justify-between text-success"><span>+ Cash receipts</span><span className="tabular">{money(shift.cashReceived)}</span></div>
              <div className="flex justify-between text-danger"><span>− Expenses paid out</span><span className="tabular">−{money(shift.expensesPaid)}</span></div>
              <div className="border-t border-border pt-1.5 flex justify-between font-semibold"><span>Expected closing</span><span className="tabular text-info">{money(shift.expectedClosing)}</span></div>
              {shift.closing > 0 && (
                <div className="flex justify-between font-semibold"><span>Counted closing</span><span className="tabular">{money(shift.closing)}</span></div>
              )}
              {shift.status !== "Open" && (
                <div className={cn(
                  "flex justify-between font-bold text-base pt-1.5 border-t border-border",
                  shift.variance < 0 ? "text-danger" : shift.variance > 0 ? "text-warning" : "text-success"
                )}>
                  <span>Variance</span>
                  <span className="tabular inline-flex items-center gap-1.5">
                    {shift.variance === 0 ? <><CheckCircle2 className="h-4 w-4" />Tally</> :
                     <>{shift.variance > 0 ? "+" : ""}{money(shift.variance)}</>}
                  </span>
                </div>
              )}
            </Card>
            {shift.varianceReason && (
              <p className="text-[11px] text-warning mt-1.5 inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />{shift.varianceReason}{shift.varianceNotes ? ` — ${shift.varianceNotes}` : ""}</p>
            )}
          </div>

          {/* Transactions sample */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Recent transactions <span className="text-[10px] text-muted-foreground normal-case font-normal">(sample)</span></p>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-surface-elevated">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SAMPLE_TXNS.map((t, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 tabular text-muted-foreground">{t.time}</td>
                      <td className="px-3 py-1.5 font-mono tabular text-[10px]">{t.ref}</td>
                      <td className="px-3 py-1.5"><span className="mr-1.5">{t.type}</span><Badge tone="neutral">{t.mode}</Badge></td>
                      <td className={cn("px-3 py-1.5 text-right tabular font-medium", t.amt < 0 && "text-danger")}>{t.amt < 0 ? "−" : ""}{money(Math.abs(t.amt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Handover */}
          {shift.handoverNotes && (
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2"><ClipboardList className="h-3 w-3 inline mr-1" />Handover to next shift</p>
              <Card className="p-3 bg-info-soft/15 border-info/20 text-sm italic">&ldquo;{shift.handoverNotes}&rdquo;</Card>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Timeline</p>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                <span>Opened by <strong>{shift.cashier}</strong> at <span className="tabular">{shift.startTime}</span> · float {money(shift.opening)}</span>
              </li>
              {shift.status !== "Open" && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning shrink-0" />
                  <span>Closed at <span className="tabular">{shift.endTime}</span> · {money(shift.closing)} counted{shift.variance !== 0 ? ` · variance ${money(shift.variance)}` : ""}</span>
                </li>
              )}
              {shift.status === "Verified" && (
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                  <span>Verified by <strong>{shift.verifiedBy || "Accounts"}</strong></span>
                </li>
              )}
            </ol>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 bg-surface-sunken/30 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={onPrint}><Printer className="h-3.5 w-3.5" />Print report</Button>
        </div>
      </div>
    </div>
  );
}
