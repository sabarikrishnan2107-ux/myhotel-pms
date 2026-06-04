"use client";
import * as React from "react";
import {
  Moon, Play, CheckCircle2, AlertCircle, Mail, MessageCircle, Sparkles, Shield,
  Lock, Database, Calendar, Clock, X, Eye, FileText, TrendingUp, TrendingDown,
  Wallet, BedDouble, Percent, Crown, Wrench, RefreshCw, ArrowRight, Printer,
  ChevronRight, BarChart3, FileDown, Receipt,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { AUDIT_RUNS } from "@/lib/mock-data-ext";
import { DASHBOARD_KPIS } from "@/lib/mock-data";
import { money, cn } from "@/lib/utils";

// ================== TYPES ==================
type AuditRun = typeof AUDIT_RUNS[number] & {
  cashVariance?: number;
  anomalies?: string[];
  irn?: boolean;
  backup?: boolean;
  steps?: { name: string; duration: string; status: "ok" | "warn" | "fail" }[];
};

// ================== ENRICHED SEED ==================
const ENRICHED_RUNS: AuditRun[] = AUDIT_RUNS.map((r, i) => ({
  ...r,
  cashVariance: r.status === "anomaly" ? -500 : 0,
  anomalies: r.status === "anomaly"
    ? ["Cash drawer short ₹500 (Shift #4214 · Priya M.)", "2 no-show charges not posted"]
    : [],
  irn: true,
  backup: true,
  steps: [
    { name: "Pre-checks (cashier · HK · folios)", duration: "8s", status: "ok" },
    { name: "Post nightly room charges + GST", duration: "12s", status: "ok" },
    { name: "No-show check", duration: r.noShows > 0 ? "11s" : "5s", status: r.noShows > 0 ? (i === 3 ? "warn" : "ok") : "ok" },
    { name: "Roll system date forward", duration: "3s", status: "ok" },
    { name: "Generate Manager Flash + email", duration: "9s", status: "ok" },
    { name: "Lock books · backup database", duration: "10s", status: i === 3 ? "warn" : "ok" },
  ],
}));

const WIZARD_STEPS = [
  { id: "precheck",  title: "Pre-audit checks",     description: "Verify cashier shifts, HK reconciled, all folios posted" },
  { id: "post",      title: "Post nightly charges", description: "Auto-post room rent + GST for in-house guests" },
  { id: "noshow",    title: "No-show review",       description: "Cancel + charge any unarrived bookings" },
  { id: "roll",      title: "Roll date forward",    description: "Advance system date to next business day" },
  { id: "reports",   title: "Generate reports",     description: "Manager Flash + email/WhatsApp delivery" },
  { id: "lock",      title: "Lock books · backup",  description: "Close the day, encrypt + back up data" },
] as const;

// ================== MAIN PAGE ==================
export default function NightAuditPage() {
  const last: AuditRun = ENRICHED_RUNS[0];
  const [showWizard, setShowWizard] = React.useState(false);
  const [detailRun, setDetailRun] = React.useState<AuditRun | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Pre-audit checks — simulated "current state" indicators
  const preChecks = [
    { label: "Cashier shifts", value: "3 of 3 closed",       sub: "1 awaiting verification", status: "warn" as const, icon: Wallet, href: "/accounts" },
    { label: "Housekeeping",   value: "5 rooms still dirty", sub: "0 inspected pending",      status: "warn" as const, icon: Crown, href: "/housekeeping" },
    { label: "Open folios",    value: "8 to be posted",      sub: "₹1,42,500 charges queued",  status: "ok"   as const, icon: Receipt, href: "/folio" },
    { label: "Maintenance",    value: "0 open tickets",      sub: "all priority issues clear", status: "ok"   as const, icon: Wrench, href: "/maintenance" },
    { label: "GST e-Invoice",  value: "12 IRNs generated",   sub: "all reconciled with NIC",   status: "ok"   as const, icon: Shield, href: "/accounts" },
    { label: "Database backup",value: "Last: 2h ago",         sub: "next: at audit close",     status: "ok"   as const, icon: Database, href: "#" },
  ];

  const passingChecks = preChecks.filter(c => c.status === "ok").length;
  const auditReady = passingChecks >= 4; // soft gate

  // Manager Flash (today's DTD)
  const flash = {
    revenue: 142850,        revenueDelta: 12,
    adr:     8450,          adrDelta: -3,
    revpar:  5240,          revparDelta: 8,
    occupancy: 62,          occupancyDelta: 5,
    cashCollected: 184500,  cashDelta: 18,
    taxLiability: 21630,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight inline-flex items-center gap-2"><Moon className="h-5 w-5 text-brand" />Night Audit</h1>
          <p className="text-muted-foreground text-sm mt-1">Auto-runs daily at 00:00 · Manager Flash delivered via Email + WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast("Audit schedule preferences opened")}>
            <Clock className="h-4 w-4" />Schedule
          </Button>
          <Button onClick={() => setShowWizard(true)}>
            <Play className="h-4 w-4" />Run audit now
          </Button>
        </div>
      </div>

      {/* Last audit hero */}
      <Card className={cn(
        "p-5 border-l-4",
        last.status === "success" ? "border-l-success" : "border-l-warning"
      )}>
        <div className="flex flex-wrap items-start gap-4">
          <span className={cn(
            "h-12 w-12 rounded-md flex items-center justify-center shrink-0",
            last.status === "success" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
          )}>
            {last.status === "success" ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-lg">Last audit · {last.date}</p>
              <Badge tone={last.status === "success" ? "success" : "warning"}>{last.status}</Badge>
              <Badge tone="neutral">{last.duration}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 tabular">Completed at {last.runAt} · {(last.anomalies || []).length} anomaly{(last.anomalies || []).length === 1 ? "" : "ies"}</p>
            <p className="text-xs text-muted-foreground mt-2 inline-flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 text-brand mt-0.5 shrink-0" />
              <span><span className="text-foreground font-medium">AI summary:</span> Strong day with {last.occupancy}% occupancy. All payments reconciled. {last.noShows === 0 ? "No no-shows." : `${last.noShows} no-show${last.noShows === 1 ? "" : "s"}.`} Tomorrow&apos;s pace looks {flash.revenueDelta}% higher.</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailRun(last)}><Eye className="h-3.5 w-3.5" />View report</Button>
            <Button variant="outline" size="sm" onClick={() => showToast("Email report resent to property@thepearl.in")}><Mail className="h-3.5 w-3.5" />Email</Button>
            <Button variant="outline" size="sm" onClick={() => showToast("WhatsApp summary resent to 3 managers")}><MessageCircle className="h-3.5 w-3.5" />Resend WA</Button>
          </div>
        </div>
      </Card>

      {/* Pre-audit health checks */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Pre-audit health</p>
            <p className="font-semibold mt-0.5">System checks before tonight&apos;s audit</p>
          </div>
          <Badge tone={auditReady ? "success" : "warning"}>
            {passingChecks}/{preChecks.length} green
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {preChecks.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={cn(
                "rounded-md border p-3 flex items-start gap-2.5",
                c.status === "ok" ? "border-success/20 bg-success-soft/10" : "border-warning/30 bg-warning-soft/15"
              )}>
                <span className={cn(
                  "h-8 w-8 rounded-md inline-flex items-center justify-center shrink-0",
                  c.status === "ok" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                )}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{c.label}</p>
                    {c.status === "ok"
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      : <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />}
                  </div>
                  <p className="text-sm font-medium mt-0.5 truncate">{c.value}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Manager Flash */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Day-to-date</p>
            <p className="font-semibold mt-0.5 inline-flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-brand" />Manager Flash</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => showToast("Manager Flash exported to PDF")}>
            <FileDown className="h-3.5 w-3.5" />Export
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
          <FlashTile label="Revenue"        value={money(flash.revenue)}        delta={flash.revenueDelta}    icon={TrendingUp} />
          <FlashTile label="ADR"            value={money(flash.adr)}            delta={flash.adrDelta}        icon={BedDouble} />
          <FlashTile label="RevPAR"         value={money(flash.revpar)}         delta={flash.revparDelta}     icon={TrendingUp} />
          <FlashTile label="Occupancy"      value={`${flash.occupancy}%`}       delta={flash.occupancyDelta}  icon={Percent} suffix="pp" />
          <FlashTile label="Cash collected" value={money(flash.cashCollected)}  delta={flash.cashDelta}       icon={Wallet} />
          <FlashTile label="Tax payable"    value={money(flash.taxLiability)}                                  icon={Receipt} />
        </div>
      </Card>

      {/* History */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between">
          <p className="font-semibold">Audit history</p>
          <Badge tone="neutral">{ENRICHED_RUNS.length} runs</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Date</th>
                <th className="px-5 py-2.5 font-semibold">Ran at</th>
                <th className="px-5 py-2.5 font-semibold">Duration</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold text-right">Occupancy</th>
                <th className="px-5 py-2.5 font-semibold text-right">Revenue</th>
                <th className="px-5 py-2.5 font-semibold text-right">No-shows</th>
                <th className="px-5 py-2.5 font-semibold text-right">Variance</th>
                <th className="px-5 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ENRICHED_RUNS.map(r => (
                <tr key={r.id} className={cn("hover:bg-surface-sunken/40 transition-colors cursor-pointer", r.status === "anomaly" && "bg-warning-soft/10")} onClick={() => setDetailRun(r)}>
                  <td className="px-5 py-3 font-medium">{r.date}</td>
                  <td className="px-5 py-3 text-muted-foreground tabular">{r.runAt}</td>
                  <td className="px-5 py-3 text-muted-foreground tabular">{r.duration}</td>
                  <td className="px-5 py-3">
                    <Badge tone={r.status === "success" ? "success" : "warning"}>
                      {r.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right tabular">{r.occupancy}%</td>
                  <td className="px-5 py-3 text-right tabular font-medium">{money(r.revenue)}</td>
                  <td className="px-5 py-3 text-right tabular">{r.noShows}</td>
                  <td className={cn("px-5 py-3 text-right tabular font-medium", (r.cashVariance ?? 0) === 0 ? "text-success" : "text-warning")}>
                    {(r.cashVariance ?? 0) === 0 ? "—" : money(r.cashVariance ?? 0)}
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => setDetailRun(r)} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="View report">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => { window.print(); showToast(`Audit ${r.date} sent to printer`); }} className="h-7 w-7 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="Print report">
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Compliance card */}
      <Card className="p-5">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Tonight&apos;s compliance</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-md border border-success/20 bg-success-soft/10 p-3 flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">GST e-Invoice (IRN)</p>
              <p className="text-[11px] text-muted-foreground">All 12 invoices signed & filed</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="rounded-md border border-success/20 bg-success-soft/10 p-3 flex items-center gap-2.5">
            <Database className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Database backup</p>
              <p className="text-[11px] text-muted-foreground">Encrypted · S3 + local disk</p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="rounded-md border border-warning/30 bg-warning-soft/15 p-3 flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Books lock</p>
              <p className="text-[11px] text-muted-foreground">Pending tonight&apos;s audit close</p>
            </div>
            <AlertCircle className="h-4 w-4 text-warning" />
          </div>
        </div>
      </Card>

      {/* Modals + drawers */}
      {showWizard && (
        <RunAuditWizard
          onClose={() => setShowWizard(false)}
          onComplete={() => { setShowWizard(false); showToast("Night audit completed successfully · 0 anomalies"); }}
          flash={flash}
        />
      )}
      {detailRun && (
        <AuditDetailDrawer
          run={detailRun}
          onClose={() => setDetailRun(null)}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ============== FLASH TILE ==============
function FlashTile({ label, value, delta, icon: Icon, suffix = "%" }: {
  label: string; value: string; delta?: number; icon: typeof TrendingUp; suffix?: string;
}) {
  const positive = (delta ?? 0) > 0;
  return (
    <div className="bg-surface p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-lg font-semibold tabular tracking-tight mt-1">{value}</p>
      {delta !== undefined && (
        <p className={cn(
          "text-[10px] tabular mt-0.5 inline-flex items-center gap-0.5",
          delta === 0 ? "text-muted-foreground" : positive ? "text-success" : "text-danger"
        )}>
          {delta < 0 && <TrendingDown className="h-2.5 w-2.5" />}
          {delta > 0 && "+"}{delta}{suffix} <span className="text-muted-foreground ml-0.5">vs LW</span>
        </p>
      )}
    </div>
  );
}

// ============== RUN AUDIT WIZARD ==============
function RunAuditWizard({ onClose, onComplete, flash }: {
  onClose: () => void;
  onComplete: () => void;
  flash: { revenue: number; adr: number; revpar: number; occupancy: number; cashCollected: number; taxLiability: number };
}) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completed, setCompleted] = React.useState<boolean[]>(Array(WIZARD_STEPS.length).fill(false));
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const advance = () => {
    setWorking(true);
    setTimeout(() => {
      setCompleted(prev => prev.map((c, i) => i === currentStep ? true : c));
      if (currentStep < WIZARD_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      setWorking(false);
    }, 700);
  };

  const isLast = currentStep === WIZARD_STEPS.length - 1;
  const allDone = completed.every(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Moon className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Run night audit</h3>
              <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {WIZARD_STEPS.length}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" disabled={working}><X className="h-4 w-4" /></button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 border-b border-border bg-surface-sunken/20">
          <ol className="flex items-center gap-1.5">
            {WIZARD_STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className={cn(
                  "h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                  completed[i] ? "bg-success text-white" :
                  i === currentStep ? "bg-brand text-brand-foreground ring-2 ring-brand/30" :
                  "bg-surface-sunken text-muted-foreground"
                )}>
                  {completed[i] ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={cn("flex-1 h-px", completed[i] ? "bg-success" : "bg-border")} />
                )}
              </li>
            ))}
          </ol>
        </div>

        {/* Step body */}
        <div className="px-5 py-5 overflow-y-auto flex-1">
          <WizardStepBody
            step={WIZARD_STEPS[currentStep].id}
            flash={flash}
            working={working}
            completed={completed[currentStep]}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-sunken/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {WIZARD_STEPS[currentStep].title}
          </p>
          <div className="flex gap-2">
            {currentStep > 0 && !allDone && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(s => s - 1)} disabled={working}>Back</Button>
            )}
            {allDone ? (
              <Button variant="success" onClick={onComplete}>
                <CheckCircle2 className="h-4 w-4" />Finish · close audit
              </Button>
            ) : !completed[currentStep] ? (
              <Button onClick={advance} disabled={working}>
                {working ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Running…</> : <>{isLast ? "Lock books" : "Run step"}<ArrowRight className="h-4 w-4" /></>}
              </Button>
            ) : (
              <Button onClick={() => setCurrentStep(s => Math.min(s + 1, WIZARD_STEPS.length - 1))} disabled={isLast}>
                Next step<ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardStepBody({ step, flash, working, completed }: {
  step: typeof WIZARD_STEPS[number]["id"];
  flash: { revenue: number; adr: number; revpar: number; occupancy: number; cashCollected: number; taxLiability: number };
  working: boolean;
  completed: boolean;
}) {
  if (step === "precheck") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold">Pre-audit checks</h4>
        <p className="text-xs text-muted-foreground">All systems verified before night audit can run.</p>
        <ul className="space-y-2">
          {[
            { label: "Cashier shifts (3/3)", ok: true,  detail: "Khalid R., Priya M., Aman S. — all closed" },
            { label: "Housekeeping",         ok: false, detail: "5 dirty rooms outstanding · will be carried forward" },
            { label: "Folio postings (8)",   ok: true,  detail: "₹1,42,500 in charges ready to settle" },
            { label: "Open maintenance",     ok: true,  detail: "No tickets blocking audit" },
            { label: "GST IRN registry",     ok: true,  detail: "12 e-Invoices submitted to NIC" },
            { label: "Database connectivity",ok: true,  detail: "Primary + replica responsive" },
          ].map((c, i) => (
            <li key={i} className={cn(
              "flex items-start gap-2.5 p-2.5 rounded-md border",
              c.ok ? "border-success/20 bg-success-soft/10" : "border-warning/30 bg-warning-soft/15"
            )}>
              {c.ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === "post") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold">Post nightly room charges</h4>
        <p className="text-xs text-muted-foreground">Automated posting of room rent + 12% GST (CGST 6 + SGST 6) for all in-house guests.</p>
        <Card className="p-3 bg-info-soft/15 border-info/20">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-muted-foreground">In-house rooms</p><p className="font-semibold tabular text-lg">28</p></div>
            <div><p className="text-muted-foreground">Total rent</p><p className="font-semibold tabular text-lg">{money(2_36_500)}</p></div>
            <div><p className="text-muted-foreground">+ GST 12%</p><p className="font-semibold tabular text-lg">{money(28_380)}</p></div>
          </div>
        </Card>
        {working && <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" />Posting charges to folios…</p>}
        {completed && <p className="text-xs text-success inline-flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" />All 28 charges posted successfully</p>}
      </div>
    );
  }
  if (step === "noshow") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold">No-show review</h4>
        <p className="text-xs text-muted-foreground">Pre-arrival bookings that didn&apos;t check in. Charge or release per policy.</p>
        <ul className="space-y-2">
          {[
            { guest: "Rohit Khanna",   booking: "BK100247", policy: "First night charged", action: "Auto-charge ₹4,500" },
            { guest: "Sneha Iyer",     booking: "BK100251", policy: "Full refund (medical)", action: "Cancelled · refund queued" },
          ].map((n, i) => (
            <li key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-warning/30 bg-warning-soft/10">
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.guest} · {n.booking}</p>
                <p className="text-[11px] text-muted-foreground">{n.policy}</p>
              </div>
              <Badge tone="warning">{n.action}</Badge>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === "roll") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold">Roll system date forward</h4>
        <p className="text-xs text-muted-foreground">Once confirmed, today&apos;s business day advances to tomorrow. Cannot be reversed without admin override.</p>
        <Card className="p-4 bg-brand-soft/20 border-brand/30 text-center">
          <Calendar className="h-8 w-8 mx-auto text-brand mb-2" />
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Business day</p>
          <p className="text-2xl font-bold tabular mt-1">24 May 2026</p>
          <ArrowRight className="h-5 w-5 mx-auto my-2 text-brand" />
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Will become</p>
          <p className="text-2xl font-bold tabular mt-1 text-brand">25 May 2026</p>
        </Card>
      </div>
    );
  }
  if (step === "reports") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold">Generate end-of-day reports</h4>
        <p className="text-xs text-muted-foreground">Manager Flash delivered via Email + WhatsApp + dashboard. Detailed reports archived under /reports.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { name: "Manager Flash",      meta: "1 PDF · 3 recipients" },
            { name: "DTD Revenue",        meta: "Excel · auto-reconciled" },
            { name: "Occupancy by type",  meta: "PDF · trends 30d" },
            { name: "Cash & receipts",    meta: "Excel · CA-ready" },
            { name: "Tax liability",      meta: "JSON · GST module" },
            { name: "Housekeeping log",   meta: "PDF · audit trail" },
          ].map(r => (
            <div key={r.name} className="rounded-md border border-border p-2.5">
              <p className="text-sm font-medium inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-brand" />{r.name}</p>
              <p className="text-[11px] text-muted-foreground">{r.meta}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (step === "lock") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold">Lock books · backup database</h4>
        <p className="text-xs text-muted-foreground">After lock, transactions for 24 May 2026 become read-only. A full encrypted backup is uploaded to S3 + local NAS.</p>
        <div className="space-y-2">
          <Card className="p-3 bg-info-soft/15 border-info/20">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Today&apos;s flash</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5 text-xs">
              <div><p className="text-muted-foreground">Revenue</p><p className="font-semibold tabular">{money(flash.revenue)}</p></div>
              <div><p className="text-muted-foreground">ADR</p><p className="font-semibold tabular">{money(flash.adr)}</p></div>
              <div><p className="text-muted-foreground">Occupancy</p><p className="font-semibold tabular">{flash.occupancy}%</p></div>
              <div><p className="text-muted-foreground">Tax payable</p><p className="font-semibold tabular">{money(flash.taxLiability)}</p></div>
            </div>
          </Card>
          <Card className="p-3 bg-warning-soft/15 border-warning/30 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p><strong>Final check:</strong> Confirm with property manager before locking. Reopening the day requires admin password and creates an audit log entry.</p>
          </Card>
        </div>
      </div>
    );
  }
  return null;
}

// ============== AUDIT DETAIL DRAWER ==============
function AuditDetailDrawer({ run, onClose, onToast }: {
  run: AuditRun;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-linear-to-r from-brand-soft/30 to-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Night audit report</p>
              <h3 className="font-semibold text-lg truncate">{run.date}</h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge tone={run.status === "success" ? "success" : "warning"}>
                  {run.status === "success" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                  {run.status}
                </Badge>
                <Badge tone="neutral">{run.duration}</Badge>
                <Badge tone="neutral">started {run.runAt}</Badge>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-1.5 mt-3">
            <button type="button" onClick={() => onToast(`Email report sent for ${run.date}`)} className="flex-1 h-9 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Mail className="h-3.5 w-3.5" />Email</button>
            <button type="button" onClick={() => onToast(`WhatsApp summary resent for ${run.date}`)} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</button>
            <button type="button" onClick={() => window.print()} className="flex-1 h-9 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Printer className="h-3.5 w-3.5" />Print</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <BedDouble className="h-4 w-4 mx-auto text-brand mb-1" />
              <p className="text-lg font-bold tabular">{run.occupancy}%</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Occupancy</p>
            </Card>
            <Card className="p-3 text-center">
              <Wallet className="h-4 w-4 mx-auto text-success mb-1" />
              <p className="text-lg font-bold tabular">{money(run.revenue)}</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Revenue</p>
            </Card>
            <Card className="p-3 text-center">
              <AlertCircle className={cn("h-4 w-4 mx-auto mb-1", run.noShows > 0 ? "text-warning" : "text-success")} />
              <p className="text-lg font-bold tabular">{run.noShows}</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">No-shows</p>
            </Card>
            <Card className="p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto text-info mb-1" />
              <p className="text-lg font-bold tabular">{money(Math.floor(run.revenue / Math.max(1, Math.round(DASHBOARD_KPIS.occupied * run.occupancy / 100))))}</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">ADR</p>
            </Card>
            <Card className="p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-brand mb-1" />
              <p className="text-lg font-bold tabular">{money(Math.floor(run.revenue / DASHBOARD_KPIS.totalRooms))}</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">RevPAR</p>
            </Card>
            <Card className="p-3 text-center">
              <Wallet className={cn("h-4 w-4 mx-auto mb-1", (run.cashVariance ?? 0) === 0 ? "text-success" : "text-warning")} />
              <p className={cn("text-lg font-bold tabular", (run.cashVariance ?? 0) === 0 ? "text-success" : "text-warning")}>
                {(run.cashVariance ?? 0) === 0 ? "0" : money(run.cashVariance ?? 0)}
              </p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Cash variance</p>
            </Card>
          </div>

          {/* Steps timeline */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Audit steps</p>
            <ol className="relative space-y-2.5">
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
              {(run.steps || []).map((s, i) => (
                <li key={i} className="relative pl-8">
                  <span className={cn(
                    "absolute left-0 top-0.5 h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ring-2 ring-surface",
                    s.status === "ok" ? "bg-success text-white" :
                    s.status === "warn" ? "bg-warning text-white" : "bg-danger text-white"
                  )}>
                    {s.status === "ok" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground tabular">{s.duration}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Anomalies */}
          {run.anomalies && run.anomalies.length > 0 && (
            <Card className="p-3 bg-warning-soft/15 border-warning/30">
              <p className="text-xs font-bold uppercase tracking-wider text-warning inline-flex items-center gap-1.5"><AlertCircle className="h-3 w-3" />Anomalies detected</p>
              <ul className="mt-2 space-y-1.5">
                {run.anomalies.map((a, i) => (
                  <li key={i} className="text-sm flex items-start gap-2"><ChevronRight className="h-3 w-3 text-warning shrink-0 mt-0.5" />{a}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Compliance */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Compliance</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
                <span className="inline-flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-muted-foreground" />GST e-Invoice IRN</span>
                <Badge tone={run.irn ? "success" : "danger"}>{run.irn ? "Signed" : "Missing"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5 border-b border-border">
                <span className="inline-flex items-center gap-2"><Database className="h-3.5 w-3.5 text-muted-foreground" />Database backup</span>
                <Badge tone={run.backup ? "success" : "danger"}>{run.backup ? "Encrypted" : "Failed"}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm py-1.5">
                <span className="inline-flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-muted-foreground" />Books</span>
                <Badge tone="success">Locked</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
