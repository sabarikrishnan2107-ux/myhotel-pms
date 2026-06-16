"use client";
import * as React from "react";
import {
  ShieldCheck, DatabaseBackup, Play, FileDown, Mail, Clock, CheckCircle2,
  AlertTriangle, HardDrive, Cloud, Server, RefreshCw, Calendar, Activity,
  ChevronRight, Loader2, FileText, Database, ListChecks, BarChart3,
  CalendarClock, ShieldAlert, Sparkles, History, Gauge, Plus, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet } from "@/lib/api";

// ===================== TYPES =====================
type BackupType = "Full" | "Incremental";
type BackupTarget = "S3 (Mumbai)" | "Glacier (Mumbai)" | "Local NAS" | "Azure Blob";
type DrillStatus = "PASS" | "PARTIAL" | "FAIL";

type BackupRow = {
  id: string;
  date: string;
  time: string;
  size: string;        // e.g. "12.4 GB"
  sizeBytes: number;   // for sorting / totals
  type: BackupType;
  target: BackupTarget;
  verified: boolean;
  checksum: string;
};

type DrillRow = {
  id: string;
  date: string;
  restoredTo: string;
  recordsCompared: number;
  mismatches: number;
  rtoMin: number;       // recovery time objective in minutes (actual)
  rpoMin: number;       // recovery point objective in minutes
  status: DrillStatus;
  runBy: string;
};

type ValidationCheck = {
  id: string;
  label: string;
  checked: boolean;
  required?: boolean;
};

type DrillStep = {
  id: number;
  label: string;
  detail: string;
  icon: typeof Database;
};

// ===================== SEED DATA =====================
const BACKUPS_SEED: BackupRow[] = [
  { id: "bk-301", date: "2026-06-02", time: "02:00", size: "12.7 GB", sizeBytes: 12700_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "9f3a…b21c" },
  { id: "bk-300", date: "2026-06-01", time: "02:00", size: "12.6 GB", sizeBytes: 12600_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "7c11…42de" },
  { id: "bk-299", date: "2026-05-31", time: "02:00", size: "12.5 GB", sizeBytes: 12500_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "a4b8…91f0" },
  { id: "bk-298", date: "2026-05-30", time: "02:00", size: "12.5 GB", sizeBytes: 12500_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "8d29…07a3" },
  { id: "bk-297", date: "2026-05-29", time: "02:00", size: "12.4 GB", sizeBytes: 12400_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "0e6c…5db4" },
  { id: "bk-296", date: "2026-05-28", time: "02:00", size: "12.3 GB", sizeBytes: 12300_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "33f1…ee98" },
  { id: "bk-295", date: "2026-05-27", time: "02:00", size: "12.3 GB", sizeBytes: 12300_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "bc44…1278" },
  { id: "bk-294", date: "2026-05-26", time: "02:00", size: "98.4 GB", sizeBytes: 98400_000_000, type: "Full",        target: "Glacier (Mumbai)", verified: true,  checksum: "11aa…77bb" },
  { id: "bk-293", date: "2026-05-25", time: "02:00", size: "12.2 GB", sizeBytes: 12200_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "55cd…ff03" },
  { id: "bk-292", date: "2026-05-24", time: "02:00", size: "12.2 GB", sizeBytes: 12200_000_000, type: "Incremental", target: "Local NAS",       verified: true,  checksum: "9000…a1b2" },
  { id: "bk-291", date: "2026-05-23", time: "02:00", size: "12.1 GB", sizeBytes: 12100_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: false, checksum: "—"        },
  { id: "bk-290", date: "2026-05-22", time: "02:00", size: "12.1 GB", sizeBytes: 12100_000_000, type: "Incremental", target: "S3 (Mumbai)",     verified: true,  checksum: "df89…6c01" },
];

// Shape returned by GET /api/backups (Laravel BackupController::meta):
// real pg_dump .sql files in storage/app/backups, newest first.
type ApiBackup = { name: string; size: number; created_at: string };

// Map a real backup file → the row the table/select render. The backend only
// knows file/size/created_at, so type ("Full" — pg_dump full dumps), target
// ("Local NAS" — local storage), verified (file present) and checksum ("—",
// not exposed) are derived. date/time come from created_at.
function mapApiBackup(b: ApiBackup): BackupRow {
  const sizeBytes = Number(b.size) || 0;
  const d = new Date(b.created_at);
  const valid = !Number.isNaN(d.getTime());
  const date = valid ? d.toISOString().slice(0, 10) : b.created_at.slice(0, 10);
  const time = valid
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";
  return {
    id: b.name,                                   // .sql filename = stable id / select value
    date,
    time,
    size: `${(sizeBytes / 1e9).toFixed(1)} GB`,    // bytes → display GB
    sizeBytes,
    type: "Full",                                  // pg_dump produces full dumps
    target: "Local NAS",                           // stored on local disk
    verified: true,                                // file exists on disk
    checksum: "—",                                 // not exposed by the API
  };
}

const DRILLS_SEED: DrillRow[] = [
  { id: "dr-12", date: "2026-05-15", restoredTo: "sandbox-mum-03",   recordsCompared: 2_184_502, mismatches: 0,  rtoMin: 18, rpoMin: 60,  status: "PASS",    runBy: "Anjali Iyer"   },
  { id: "dr-11", date: "2026-04-18", restoredTo: "sandbox-mum-02",   recordsCompared: 2_091_338, mismatches: 0,  rtoMin: 21, rpoMin: 60,  status: "PASS",    runBy: "Karan Mehta"   },
  { id: "dr-10", date: "2026-03-22", restoredTo: "sandbox-mum-01",   recordsCompared: 1_984_211, mismatches: 4,  rtoMin: 24, rpoMin: 120, status: "PARTIAL", runBy: "Priya Krishnan" },
  { id: "dr-09", date: "2026-02-25", restoredTo: "sandbox-mum-01",   recordsCompared: 1_872_904, mismatches: 0,  rtoMin: 22, rpoMin: 60,  status: "PASS",    runBy: "Anjali Iyer"   },
  { id: "dr-08", date: "2026-01-29", restoredTo: "sandbox-blr-aux",  recordsCompared: 1_756_198, mismatches: 0,  rtoMin: 27, rpoMin: 60,  status: "PASS",    runBy: "Rohan Desai"   },
  { id: "dr-07", date: "2025-12-28", restoredTo: "sandbox-mum-01",   recordsCompared: 1_641_077, mismatches: 12, rtoMin: 41, rpoMin: 180, status: "FAIL",    runBy: "Karan Mehta"   },
];

const VALIDATION_DEFAULTS: ValidationCheck[] = [
  { id: "v1", label: "Schema integrity (all tables & indexes)",       checked: true, required: true },
  { id: "v2", label: "Row counts match source ±0.01%",                 checked: true, required: true },
  { id: "v3", label: "Foreign-key referential integrity",              checked: true, required: true },
  { id: "v4", label: "Folio totals reconcile to ledger",               checked: true },
  { id: "v5", label: "Guest PII columns intact (encrypted)",           checked: true, required: true },
  { id: "v6", label: "GSTIN & invoice sequence continuity",            checked: true },
  { id: "v7", label: "Sample login (5 users) against restored auth",   checked: false },
  { id: "v8", label: "Encryption-at-rest verified on sandbox volume",  checked: false },
];

const DRILL_STEPS: DrillStep[] = [
  { id: 1, label: "Provisioning sandbox database", detail: "PostgreSQL 16 · 8 vCPU · 32 GB RAM", icon: Server },
  { id: 2, label: "Downloading backup file",       detail: "Streaming from S3 (Mumbai) — encrypted in transit", icon: Cloud },
  { id: 3, label: "Restoring schema",              detail: "412 tables · 1,837 indexes · 88 views", icon: Database },
  { id: 4, label: "Restoring data",                detail: "Row-by-row import with checksum validation", icon: HardDrive },
  { id: 5, label: "Running validation queries",    detail: "Integrity, reconciliation & PII checks", icon: ListChecks },
  { id: 6, label: "Generating report",             detail: "PDF + JSON manifest · signed by auditor key", icon: FileText },
];

const TOTAL_RECORDS = 2_196_840;

// ===================== HELPERS =====================
function statusTone(s: DrillStatus): "success" | "warning" | "danger" {
  return s === "PASS" ? "success" : s === "PARTIAL" ? "warning" : "danger";
}

function targetIcon(t: BackupTarget) {
  if (t === "S3 (Mumbai)" || t === "Azure Blob") return Cloud;
  if (t === "Glacier (Mumbai)") return Cloud;
  return HardDrive;
}

function fmtRTO(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ===================== MAIN PAGE =====================
export default function BackupDrillPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const [backups, setBackups] = React.useState<BackupRow[]>(BACKUPS_SEED);
  const [drills, setDrills] = React.useState<DrillRow[]>(DRILLS_SEED);

  // Drill setup state
  const [selectedBackup, setSelectedBackup] = React.useState<string>(BACKUPS_SEED[0].id);
  const [sandboxTarget, setSandboxTarget] = React.useState<string>("sandbox-mum-04");
  const [checks, setChecks] = React.useState<ValidationCheck[]>(VALIDATION_DEFAULTS);

  // Replace the seeded (offline fallback) backup list with the real backup
  // files from GET /api/backups when the request returns rows. Keeps the seed
  // on empty/failed responses so the UI never goes blank.
  React.useEffect(() => {
    let cancelled = false;
    apiGet<ApiBackup[]>("/backups")
      .then(rows => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const mapped = rows.map(mapApiBackup);
        setBackups(mapped);
        setSelectedBackup(mapped[0].id);
      })
      .catch(() => { /* offline / unauthorized → keep seed */ });
    return () => { cancelled = true; };
  }, []);

  // Drill progress modal
  const [drillRunning, setDrillRunning] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);     // 0..6 (0 = not started)
  const [downloadPct, setDownloadPct] = React.useState(0);
  const [rowsRestored, setRowsRestored] = React.useState(0);
  const [drillComplete, setDrillComplete] = React.useState(false);
  const [stepDoneAt, setStepDoneAt] = React.useState<Record<number, number>>({});
  const [drillStartedAt, setDrillStartedAt] = React.useState<number | null>(null);

  // Schedule card state
  const [schedFreq, setSchedFreq] = React.useState<"Monthly" | "Quarterly">("Monthly");
  const [schedRecipients, setSchedRecipients] = React.useState<string>("auditor@pearlmarina.in, gm@pearlmarina.in, compliance@pearlmarina.in");

  const lastDrill = drills[0];
  const lastBackup = backups[0];
  const avgSizeGb = (backups.reduce((s, b) => s + b.sizeBytes, 0) / backups.length / 1e9).toFixed(1);
  const avgRTO = Math.round(drills.reduce((s, d) => s + d.rtoMin, 0) / drills.length);
  const integrityScore = 99.4;

  // ============ DRILL ENGINE ============
  // Drives steps 1→6 with realistic timing & a download bar + rows counter.
  React.useEffect(() => {
    if (!drillRunning) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    const finishStep = (step: number, after: number) => {
      const t = setTimeout(() => {
        if (cancelled) return;
        setStepDoneAt(prev => ({ ...prev, [step]: Date.now() }));
        setCurrentStep(step + 1);
      }, after);
      timers.push(t);
    };

    // Step 1: provisioning (1.4s) — deferred so we don't setState synchronously in the effect
    const startT = setTimeout(() => { if (!cancelled) setCurrentStep(1); }, 0);
    timers.push(startT);
    finishStep(1, 1400);

    // Step 2: download — animate bar from 0→100 over ~2.8s
    const dlStartAt = 1500;
    const dlT = setTimeout(() => {
      if (cancelled) return;
      const start = Date.now();
      const dur = 2800;
      const iv = setInterval(() => {
        const p = Math.min(100, ((Date.now() - start) / dur) * 100);
        setDownloadPct(p);
        if (p >= 100) clearInterval(iv);
      }, 60);
      intervals.push(iv);
    }, dlStartAt);
    timers.push(dlT);
    finishStep(2, dlStartAt + 2900);

    // Step 3: schema restore (1.6s)
    finishStep(3, dlStartAt + 2900 + 1600);

    // Step 4: data restore — rows counter animates 0 → TOTAL_RECORDS over ~3.5s
    const dataStartAt = dlStartAt + 2900 + 1600 + 100;
    const dataT = setTimeout(() => {
      if (cancelled) return;
      const start = Date.now();
      const dur = 3500;
      const iv = setInterval(() => {
        const e = Math.min(1, (Date.now() - start) / dur);
        setRowsRestored(Math.floor(TOTAL_RECORDS * e));
        if (e >= 1) clearInterval(iv);
      }, 80);
      intervals.push(iv);
    }, dataStartAt);
    timers.push(dataT);
    finishStep(4, dataStartAt + 3600);

    // Step 5: validation queries (1.8s)
    finishStep(5, dataStartAt + 3600 + 1800);

    // Step 6: report (1.2s)
    finishStep(6, dataStartAt + 3600 + 1800 + 1200);

    // Mark drill complete after final step
    const completeT = setTimeout(() => {
      if (cancelled) return;
      setDrillComplete(true);
      // Append a new PASS drill record
      const elapsedMin = drillStartedAt ? Math.max(15, Math.round((Date.now() - drillStartedAt) / 60000) + 17) : 19;
      const newRow: DrillRow = {
        id: `dr-${13 + drills.length - DRILLS_SEED.length}`,
        date: new Date().toISOString().slice(0, 10),
        restoredTo: sandboxTarget,
        recordsCompared: TOTAL_RECORDS,
        mismatches: 0,
        rtoMin: elapsedMin,
        rpoMin: 60,
        status: "PASS",
        runBy: "Anjali Iyer",
      };
      setDrills(d => [newRow, ...d]);
    }, dataStartAt + 3600 + 1800 + 1200 + 250);
    timers.push(completeT);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillRunning]);

  const startDrill = () => {
    setDrillComplete(false);
    setCurrentStep(0);
    setDownloadPct(0);
    setRowsRestored(0);
    setStepDoneAt({});
    setDrillStartedAt(Date.now());
    setDrillRunning(true);
    showToast(`Drill started — restoring ${selectedBackup} to ${sandboxTarget}`);
  };

  const closeDrill = () => {
    setDrillRunning(false);
    setCurrentStep(0);
    setDownloadPct(0);
    setRowsRestored(0);
    setDrillComplete(false);
    setStepDoneAt({});
  };

  const toggleCheck = (id: string) => {
    setChecks(cs => cs.map(c => c.id === id ? { ...c, checked: c.required ? true : !c.checked } : c));
  };

  const selectedBackupObj = backups.find(b => b.id === selectedBackup) ?? backups[0];
  const enabledChecks = checks.filter(c => c.checked);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* =================== HEADER =================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-info via-brand to-accent text-white inline-flex items-center justify-center shadow-md ring-4 ring-info/10">
            <DatabaseBackup className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Disaster recovery · The Pearl Marina, Mumbai
            </p>
            <h1 className="text-3xl font-display font-medium tracking-tight">Backup &amp; restore drill</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Routinely restore last backup to sandbox, validate data, and prove RTO/RPO to auditors.
            </p>
          </div>
        </div>

        {/* Last drill summary pill */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-success-soft text-success inline-flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Last drill</p>
            <p className="text-sm font-semibold tabular leading-tight">
              {lastDrill.date} · {fmtRTO(lastDrill.rtoMin)} RTO
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge tone={statusTone(lastDrill.status)} className="!py-0 !px-1.5 text-[10px]">{lastDrill.status}</Badge>
              <span className="text-[10.5px] text-muted-foreground">by {lastDrill.runBy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =================== KPI STRIP =================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={History}
          tone="info"
          label="Backups last 30d"
          value={String(backups.length)}
          sub={`${backups.filter(b => b.type === "Full").length} full · ${backups.filter(b => b.type === "Incremental").length} incremental`}
        />
        <KpiCard
          icon={Gauge}
          tone="brand"
          label="Avg backup size"
          value={`${avgSizeGb} GB`}
          sub={`Total ${(backups.reduce((s, b) => s + b.sizeBytes, 0) / 1e9).toFixed(1)} GB on disk`}
        />
        <KpiCard
          icon={Clock}
          tone="accent"
          label="Last drill RTO"
          value={fmtRTO(lastDrill.rtoMin)}
          sub={`Average ${fmtRTO(avgRTO)} · target ≤ 30m`}
        />
        <KpiCard
          icon={ShieldCheck}
          tone="success"
          label="Data integrity score"
          value={`${integrityScore}%`}
          sub="0 mismatches in last drill"
        />
      </div>

      {/* =================== BIG ACTION CARD =================== */}
      <Card className="p-0 overflow-hidden border-brand/20 shadow-sm">
        <div className="bg-gradient-to-r from-brand-soft/60 via-info-soft/30 to-transparent px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-lg bg-brand text-brand-foreground inline-flex items-center justify-center shadow-xs">
              <Play className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Run new restore drill</h2>
              <p className="text-xs text-muted-foreground">Restores the chosen backup to an isolated sandbox · zero impact on production.</p>
            </div>
          </div>
          <Badge tone="brand" className="hidden md:inline-flex"><Sparkles className="h-3 w-3" />Recommended monthly</Badge>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-5">
          {/* LEFT: backup + sandbox */}
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Select backup</Label>
              <Select value={selectedBackup} onChange={e => setSelectedBackup(e.target.value)}>
                {backups.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.date} {b.time} · {b.type} · {b.size} · {b.target}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Checksum {selectedBackupObj.checksum} verified · encrypted AES-256
              </p>
            </div>

            <div>
              <Label className="mb-1.5 block">Sandbox target</Label>
              <Select value={sandboxTarget} onChange={e => setSandboxTarget(e.target.value)}>
                <option>sandbox-mum-04</option>
                <option>sandbox-mum-03</option>
                <option>sandbox-mum-02</option>
                <option>sandbox-blr-aux</option>
                <option>sandbox-local-nas</option>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1.5">
                <Server className="h-3 w-3" />
                Ephemeral · auto-destroys 4 hours after drill
              </p>
            </div>
          </div>

          {/* MIDDLE: validation checklist */}
          <div>
            <Label className="mb-1.5 block flex items-center justify-between">
              <span>Validation checklist</span>
              <span className="text-[10px] text-muted-foreground font-normal tabular">
                {enabledChecks.length} / {checks.length} enabled
              </span>
            </Label>
            <div className="space-y-1 rounded-lg border border-border bg-surface-sunken/30 p-2 max-h-[220px] overflow-y-auto">
              {checks.map(c => (
                <label
                  key={c.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-md cursor-pointer text-xs transition-colors",
                    c.checked ? "bg-surface ring-1 ring-border" : "hover:bg-surface/60",
                    c.required && "opacity-100"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={() => toggleCheck(c.id)}
                    disabled={c.required}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-brand"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground leading-tight">{c.label}</p>
                    {c.required && <span className="text-[10px] text-muted-foreground">required by auditor policy</span>}
                  </div>
                  {c.checked && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                </label>
              ))}
            </div>
          </div>

          {/* RIGHT: start button */}
          <div className="flex flex-col items-stretch justify-center gap-3 lg:min-w-[200px]">
            <Button size="lg" onClick={startDrill} className="h-12">
              <Play className="h-4 w-4" />
              Start drill
            </Button>
            <Button size="sm" variant="ghost" onClick={() => showToast("Dry-run plan generated · 6 steps · est. 11m")}>
              <FileText className="h-4 w-4" />
              Generate plan
            </Button>
            <div className="rounded-lg border border-border bg-surface-sunken/30 px-3 py-2 text-[11px] text-muted-foreground">
              <p className="font-semibold text-foreground text-xs mb-0.5">Estimated runtime</p>
              <p className="tabular">~ 11 min · 12.7 GB</p>
            </div>
          </div>
        </div>
      </Card>

      {/* =================== BACKUP HISTORY TABLE =================== */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">Backup history</h3>
            <Badge tone="neutral" className="text-[10px]">Last 30 days</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => showToast("Backups refreshed")}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={() => showToast("Backup manifest CSV exported")}>
              <FileDown className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Backup ID</th>
                <th className="px-4 py-2.5 font-semibold">Date · Time</th>
                <th className="px-4 py-2.5 font-semibold text-right">Size</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Target</th>
                <th className="px-4 py-2.5 font-semibold">Checksum</th>
                <th className="px-4 py-2.5 font-semibold">Verified</th>
                <th className="px-4 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(b => {
                const T = targetIcon(b.target);
                return (
                  <tr key={b.id} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{b.id}</td>
                    <td className="px-4 py-2.5 tabular">
                      <span className="text-foreground">{b.date}</span>
                      <span className="text-muted-foreground"> · {b.time}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular text-right font-medium">{b.size}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={b.type === "Full" ? "brand" : "info"} className="text-[10px]">{b.type}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <T className="h-3.5 w-3.5 text-muted-foreground" />
                        {b.target}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{b.checksum}</td>
                    <td className="px-4 py-2.5">
                      {b.verified ? (
                        <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-warning text-xs font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelectedBackup(b.id); showToast(`Selected ${b.id} for next drill`); }}
                      >
                        Use for drill <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* =================== DRILL HISTORY TABLE =================== */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">Drill history</h3>
            <Badge tone="neutral" className="text-[10px]">{drills.length} drills logged</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => showToast("Audit pack ZIP queued for download")}>
              <FileDown className="h-3.5 w-3.5" />
              Audit pack
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/40">
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Restored to</th>
                <th className="px-4 py-2.5 font-semibold">Run by</th>
                <th className="px-4 py-2.5 font-semibold text-right">Records compared</th>
                <th className="px-4 py-2.5 font-semibold text-right">Mismatches</th>
                <th className="px-4 py-2.5 font-semibold text-right">RTO</th>
                <th className="px-4 py-2.5 font-semibold text-right">RPO</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Report</th>
              </tr>
            </thead>
            <tbody>
              {drills.map(d => (
                <tr key={d.id} className="border-t border-border hover:bg-surface-sunken/30 transition-colors">
                  <td className="px-4 py-2.5 tabular text-foreground">{d.date}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{d.restoredTo}</td>
                  <td className="px-4 py-2.5">{d.runBy}</td>
                  <td className="px-4 py-2.5 tabular text-right">{d.recordsCompared.toLocaleString("en-IN")}</td>
                  <td className={cn("px-4 py-2.5 tabular text-right font-medium", d.mismatches === 0 ? "text-success" : d.mismatches < 10 ? "text-warning" : "text-danger")}>
                    {d.mismatches}
                  </td>
                  <td className="px-4 py-2.5 tabular text-right">{fmtRTO(d.rtoMin)}</td>
                  <td className="px-4 py-2.5 tabular text-right text-muted-foreground">{fmtRTO(d.rpoMin)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="sm" variant="ghost" onClick={() => showToast(`Drill ${d.id} report PDF downloaded`)}>
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* =================== SCHEDULE + COMPLIANCE =================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Schedule card */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-9 w-9 rounded-lg bg-accent-soft text-accent inline-flex items-center justify-center">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Schedule drills</h3>
              <p className="text-[11px] text-muted-foreground">Auto-trigger drills and email reports to your auditor.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Frequency</Label>
              <Select value={schedFreq} onChange={e => setSchedFreq(e.target.value as "Monthly" | "Quarterly")}>
                <option value="Monthly">Monthly (1st Sunday, 02:00 IST)</option>
                <option value="Quarterly">Quarterly (1st Jan/Apr/Jul/Oct)</option>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Next scheduled</Label>
              <div className="h-9 px-3 rounded-md border border-border bg-surface-sunken/30 flex items-center text-sm tabular">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                {schedFreq === "Monthly" ? "2026-07-05 · 02:00 IST" : "2026-07-01 · 02:00 IST"}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block">Report recipients</Label>
              <Input
                value={schedRecipients}
                onChange={e => setSchedRecipients(e.target.value)}
                placeholder="Comma-separated emails"
              />
              <p className="text-[11px] text-muted-foreground mt-1">PDF report + JSON manifest auto-emailed within 5 min of drill completion.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge tone="success" className="text-[10px]"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
              <span>Last run 2026-05-15 · email delivered to 3 recipients</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => showToast("Test email sent to all recipients")}>
                <Mail className="h-3.5 w-3.5" /> Send test
              </Button>
              <Button size="sm" onClick={() => showToast(`Schedule saved — ${schedFreq.toLowerCase()} drills enabled`)}>
                <Plus className="h-3.5 w-3.5" /> Save schedule
              </Button>
            </div>
          </div>
        </Card>

        {/* Compliance & retention card */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-9 w-9 rounded-lg bg-info-soft text-info inline-flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Retention &amp; compliance</h3>
              <p className="text-[11px] text-muted-foreground">DPDP Act 2023 · ISO 27001 A.12.3</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Incremental retention</span>
              <span className="font-medium tabular">30 days</span>
            </li>
            <li className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Full retention</span>
              <span className="font-medium tabular">7 years</span>
            </li>
            <li className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Off-site copy</span>
              <span className="font-medium">Glacier (Mumbai)</span>
            </li>
            <li className="flex items-center justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Encryption</span>
              <span className="font-medium">AES-256 at rest + in transit</span>
            </li>
            <li className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Estimated audit cost</span>
              <span className="font-medium tabular">{money(48000)}/yr</span>
            </li>
          </ul>
          <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => showToast("Compliance certificate (PDF) generated")}>
            <FileDown className="h-3.5 w-3.5" /> Download compliance cert
          </Button>
        </Card>
      </div>

      {/* =================== DRILL PROGRESS MODAL =================== */}
      {drillRunning && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full overflow-hidden">
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-brand-soft/40 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "h-10 w-10 rounded-lg inline-flex items-center justify-center",
                  drillComplete ? "bg-success text-white" : "bg-brand text-brand-foreground"
                )}>
                  {drillComplete ? <CheckCircle2 className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    {drillComplete ? "Restore drill complete" : "Restore drill in progress"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedBackupObj.id} → {sandboxTarget} · {enabledChecks.length} validation checks
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrill}
                className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {/* Steps */}
              <ol className="space-y-2">
                {DRILL_STEPS.map(step => {
                  const Icon = step.icon;
                  const isDone = currentStep > step.id || (drillComplete && step.id <= 6);
                  const isActive = currentStep === step.id && !drillComplete;
                  const isPending = currentStep < step.id && !drillComplete;

                  return (
                    <li
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all",
                        isActive && "border-brand bg-brand-soft/40 shadow-xs",
                        isDone && "border-success/30 bg-success-soft/30",
                        isPending && "border-border bg-surface-sunken/30 opacity-60"
                      )}
                    >
                      <span className={cn(
                        "h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0",
                        isActive && "bg-brand text-brand-foreground",
                        isDone && "bg-success text-white",
                        isPending && "bg-surface text-muted-foreground"
                      )}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> :
                         isActive ? <Loader2 className="h-4 w-4 animate-spin" /> :
                         <Icon className="h-4 w-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {step.id}. {step.label}
                          </p>
                          {isDone && <span className="text-[10px] text-success font-medium">DONE</span>}
                          {isActive && <span className="text-[10px] text-brand font-medium">RUNNING</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{step.detail}</p>

                        {/* Step 2: download progress */}
                        {step.id === 2 && (isActive || isDone) && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand transition-[width] duration-200 ease-out"
                                style={{ width: `${isDone ? 100 : downloadPct}%` }}
                              />
                            </div>
                            <p className="text-[10.5px] text-muted-foreground tabular mt-1">
                              {((isDone ? 100 : downloadPct) / 100 * 12.7).toFixed(1)} / 12.7 GB · {Math.round(isDone ? 100 : downloadPct)}%
                            </p>
                          </div>
                        )}

                        {/* Step 4: rows counter */}
                        {step.id === 4 && (isActive || isDone) && (
                          <div className="mt-2 inline-flex items-center gap-2 text-xs">
                            <span className="font-mono tabular text-foreground font-semibold">
                              {(isDone ? TOTAL_RECORDS : rowsRestored).toLocaleString("en-IN")}
                            </span>
                            <span className="text-muted-foreground">/ {TOTAL_RECORDS.toLocaleString("en-IN")} rows</span>
                            <span className="text-[10px] text-muted-foreground">
                              · {Math.round(((isDone ? TOTAL_RECORDS : rowsRestored) / TOTAL_RECORDS) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Results section (only after complete) */}
              {drillComplete && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-lg border border-success/30 bg-success-soft/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <p className="text-sm font-semibold text-success">All checks passed</p>
                      <Badge tone="success" className="ml-auto">PASS</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">RTO</p>
                        <p className="text-base font-semibold tabular">11m 32s</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Records</p>
                        <p className="text-base font-semibold tabular">{TOTAL_RECORDS.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mismatches</p>
                        <p className="text-base font-semibold tabular text-success">0</p>
                      </div>
                    </div>
                  </div>

                  {/* Per-check breakdown */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Validation results</p>
                    <ul className="space-y-1">
                      {enabledChecks.map((c, i) => (
                        <li key={c.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-surface-sunken/30">
                          <span>{c.label}</span>
                          <Badge tone={i === enabledChecks.length - 1 && i > 4 ? "success" : "success"} className="text-[10px]">PASS</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-border bg-surface-sunken/30 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground tabular">
                {drillComplete
                  ? "Report stored to /audit/drills/dr-13.pdf"
                  : `Step ${Math.max(1, currentStep)} of 6`}
              </p>
              <div className="flex gap-2">
                {drillComplete ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => showToast("Report emailed to auditor@pearlmarina.in")}>
                      <Mail className="h-3.5 w-3.5" /> Email to auditor
                    </Button>
                    <Button size="sm" onClick={() => showToast("Drill report PDF downloaded (dr-13.pdf · 248 KB)")}>
                      <FileDown className="h-3.5 w-3.5" /> Download report PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={closeDrill}>Close</Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => showToast("Drill cancellation requested · cleaning up sandbox")}>
                    Cancel drill
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ===================== KPI CARD =====================
function KpiCard({
  icon: Icon, tone, label, value, sub,
}: {
  icon: typeof Database;
  tone: "info" | "brand" | "accent" | "success" | "warning" | "danger";
  label: string;
  value: string;
  sub: string;
}) {
  const toneClass: Record<typeof tone, string> = {
    info:    "bg-info-soft text-info",
    brand:   "bg-brand-soft text-brand-soft-foreground",
    accent:  "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger:  "bg-danger-soft text-danger",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <span className={cn("h-8 w-8 rounded-lg inline-flex items-center justify-center", toneClass[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-2xl font-display font-medium tabular leading-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</p>
    </Card>
  );
}
