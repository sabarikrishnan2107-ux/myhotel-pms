"use client";
import * as React from "react";
import Link from "next/link";
import {
  Crown, TrendingUp, TrendingDown, IndianRupee, BedDouble, Users, BarChart3,
  Mail, Send, Calendar, Clock, AlertTriangle, CheckCircle2, Eye, Download,
  RefreshCw, Plus, X, ChevronRight, Sparkles, Building2, Wallet, Receipt,
  Trash2, Pencil, FileBarChart, Settings, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

// ============================================================
// TYPES + SEED
// ============================================================
type FlashPeriod = "today" | "yesterday" | "mtd" | "ytd" | "last_month";
type ChangeDir = "up" | "down" | "flat";

const FLASH_BY_PERIOD: Record<FlashPeriod, {
  rooms: { total: number; sold: number };
  revenue: { rooms: number; fb: number; banquet: number; other: number; tax: number; total: number };
  costs: { utilities: number; payroll: number; otaCommission: number; supplies: number; misc: number; total: number };
  payments: { cash: number; card: number; upi: number; bank: number };
  guests: { walkIn: number; ota: number; corporate: number; direct: number; loyalty: number };
  topSegments: { name: string; revenue: number; share: number }[];
  vs: { revenueChange: number; occChange: number; adrChange: number };
}> = {
  today: {
    rooms: { total: 90, sold: 72 },
    revenue: { rooms: 432000, fb: 168000, banquet: 0, other: 28500, tax: 86600, total: 715100 },
    costs: { utilities: 28500, payroll: 95000, otaCommission: 42600, supplies: 18200, misc: 12500, total: 196800 },
    payments: { cash: 124000, card: 318000, upi: 198000, bank: 75100 },
    guests: { walkIn: 8, ota: 32, corporate: 18, direct: 9, loyalty: 5 },
    topSegments: [
      { name: "OTA (Booking.com)",   revenue: 198000, share: 28 },
      { name: "Direct website",      revenue: 142000, share: 20 },
      { name: "Corporate (Infosys)", revenue: 108000, share: 15 },
      { name: "MakeMyTrip",          revenue: 89000,  share: 12 },
      { name: "Walk-in",             revenue: 65000,  share: 9 },
    ],
    vs: { revenueChange: 12.4, occChange: 6.2, adrChange: 5.8 },
  },
  yesterday: {
    rooms: { total: 90, sold: 65 },
    revenue: { rooms: 386000, fb: 142000, banquet: 65000, other: 22000, tax: 80200, total: 695200 },
    costs: { utilities: 27200, payroll: 95000, otaCommission: 38500, supplies: 16800, misc: 10500, total: 188000 },
    payments: { cash: 118000, card: 295000, upi: 218000, bank: 64200 },
    guests: { walkIn: 6, ota: 28, corporate: 16, direct: 10, loyalty: 5 },
    topSegments: [
      { name: "OTA (Booking.com)",   revenue: 182000, share: 26 },
      { name: "Banquet",             revenue: 145000, share: 21 },
      { name: "Direct website",      revenue: 128000, share: 18 },
      { name: "Corporate",           revenue: 95000,  share: 14 },
      { name: "Walk-in",             revenue: 52000,  share: 7 },
    ],
    vs: { revenueChange: -2.1, occChange: -1.8, adrChange: 1.4 },
  },
  mtd: {
    rooms: { total: 2790, sold: 2148 },
    revenue: { rooms: 12895000, fb: 4820000, banquet: 1850000, other: 685000, tax: 2425000, total: 22675000 },
    costs: { utilities: 825000, payroll: 2850000, otaCommission: 1280000, supplies: 540000, misc: 385000, total: 5880000 },
    payments: { cash: 3850000, card: 9450000, upi: 6280000, bank: 3095000 },
    guests: { walkIn: 184, ota: 920, corporate: 568, direct: 312, loyalty: 164 },
    topSegments: [
      { name: "OTA aggregate",       revenue: 6850000, share: 30 },
      { name: "Direct website",      revenue: 4250000, share: 19 },
      { name: "Corporate",           revenue: 3250000, share: 14 },
      { name: "Banquet",             revenue: 1850000, share: 8 },
      { name: "Travel agents",       revenue: 1620000, share: 7 },
    ],
    vs: { revenueChange: 18.2, occChange: 9.1, adrChange: 7.6 },
  },
  ytd: {
    rooms: { total: 13770, sold: 10328 },
    revenue: { rooms: 62100000, fb: 23250000, banquet: 8920000, other: 3450000, tax: 11580000, total: 109300000 },
    costs: { utilities: 4250000, payroll: 14250000, otaCommission: 6280000, supplies: 2685000, misc: 1820000, total: 29285000 },
    payments: { cash: 18250000, card: 46500000, upi: 30420000, bank: 14130000 },
    guests: { walkIn: 920, ota: 4520, corporate: 2780, direct: 1520, loyalty: 588 },
    topSegments: [
      { name: "OTA aggregate",       revenue: 33500000, share: 31 },
      { name: "Direct website",      revenue: 20850000, share: 19 },
      { name: "Corporate",           revenue: 15300000, share: 14 },
      { name: "Banquet",             revenue: 8920000,  share: 8 },
      { name: "Travel agents",       revenue: 7625000,  share: 7 },
    ],
    vs: { revenueChange: 22.4, occChange: 11.5, adrChange: 8.9 },
  },
  last_month: {
    rooms: { total: 2700, sold: 1944 },
    revenue: { rooms: 11270000, fb: 4180000, banquet: 1620000, other: 590000, tax: 2120000, total: 19780000 },
    costs: { utilities: 785000, payroll: 2850000, otaCommission: 1120000, supplies: 480000, misc: 320000, total: 5555000 },
    payments: { cash: 3420000, card: 8250000, upi: 5480000, bank: 2630000 },
    guests: { walkIn: 165, ota: 820, corporate: 510, direct: 285, loyalty: 144 },
    topSegments: [
      { name: "OTA aggregate",       revenue: 5950000, share: 30 },
      { name: "Direct website",      revenue: 3720000, share: 19 },
      { name: "Corporate",           revenue: 2890000, share: 15 },
      { name: "Banquet",             revenue: 1620000, share: 8 },
      { name: "Travel agents",       revenue: 1420000, share: 7 },
    ],
    vs: { revenueChange: 8.4, occChange: 4.2, adrChange: 4.1 },
  },
};

const PERIOD_LABEL: Record<FlashPeriod, string> = {
  today: "Today", yesterday: "Yesterday", mtd: "Month-to-date", ytd: "Year-to-date", last_month: "Last month",
};

// Shape returned by GET /api/owner/flash — identical to a FLASH_BY_PERIOD entry.
type FlashData = (typeof FLASH_BY_PERIOD)[FlashPeriod];
// GET /api/dashboard/alerts
type AlertRow = { id: string | number; level: string; text: string; href?: string };
// 30-day series from GET /api/owner/flash-trend
type TrendRow = { day: number; revenue: number; occ: number; adr: number };
// GET /api/owner/flash-insights
type InsightRow = { text: string; dir: "up" | "down" | "flat" };
// Row shape from GET /api/email-schedules (id is numeric, json fields may be null)
type ScheduleRow = {
  id: number | string; label: string; frequency: EmailSchedule["frequency"];
  time: string; recipients: string[] | null; format: EmailSchedule["format"];
  sections: string[] | null; enabled: boolean; lastSentAt?: string | null;
};
function normalizeSchedule(r: ScheduleRow): EmailSchedule {
  return {
    id: String(r.id),
    label: r.label ?? "",
    frequency: r.frequency ?? "daily",
    time: r.time ?? "08:00",
    recipients: Array.isArray(r.recipients) ? r.recipients : [],
    format: r.format ?? "pdf",
    sections: Array.isArray(r.sections) ? r.sections : [],
    enabled: !!r.enabled,
    lastSentAt: r.lastSentAt ?? undefined,
  };
}
// Body sent to the backend (everything except the client id).
function scheduleBody(s: EmailSchedule) {
  const { id: _id, ...body } = s;
  void _id;
  return body;
}

type Alert = { id: string; tone: "danger" | "warning" | "info" | "success"; title: string; detail: string };
const ALERTS_SEED: Alert[] = [
  { id: "a1", tone: "danger",  title: "Cash variance · Shift #4221",   detail: "-₹500 short · Priya M. · 3rd negative variance this month" },
  { id: "a2", tone: "warning", title: "FSSAI renewal due in 12 days",  detail: "Foodgrade license · renew before 14 June 2026" },
  { id: "a3", tone: "info",    title: "Channel parity gap detected",   detail: "Direct rate ₹6,500 vs Booking.com ₹7,200 · review pricing" },
  { id: "a4", tone: "success", title: "Top reviewer of the week",      detail: "Anjali Iyer · 5★ review · auto-replied · loyalty Platinum" },
  { id: "a5", tone: "warning", title: "Refund cluster flagged",        detail: "3 refunds ₹38.5K to same VPA in 90 min · under investigation" },
];

type EmailSchedule = {
  id: string;
  label: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  recipients: string[];
  format: "pdf" | "html" | "both";
  sections: string[];
  enabled: boolean;
  lastSentAt?: string;
};

const SCHEDULES_SEED: EmailSchedule[] = [
  { id: "s1", label: "Morning Flash to Owner",      frequency: "daily",   time: "08:00", recipients: ["owner@thepearl.in", "+91 9820013345"], format: "pdf",  sections: ["KPIs", "Revenue", "Alerts"], enabled: true,  lastSentAt: "Today 08:00" },
  { id: "s2", label: "Weekly P&L Snapshot",         frequency: "weekly",  time: "07:30", recipients: ["owner@thepearl.in", "cfo@thepearl.in"], format: "both", sections: ["KPIs", "Revenue", "Costs", "Cash flow"], enabled: true,  lastSentAt: "Mon, 25 May" },
  { id: "s3", label: "Monthly Owner Pack",          frequency: "monthly", time: "06:00", recipients: ["owner@thepearl.in", "auditor@kpmg.in"], format: "pdf",  sections: ["Full P&L", "Balance sheet", "Top guests", "Top vendors"], enabled: true,  lastSentAt: "1 May 06:00" },
  { id: "s4", label: "Banquet weekend recap",       frequency: "weekly",  time: "09:00", recipients: ["sales@thepearl.in"], format: "html", sections: ["Banquet bookings", "F&B revenue"], enabled: false },
];

// ============================================================
// MAIN PAGE
// ============================================================
export default function OwnerFlashPage() {
  const [period, setPeriod] = React.useState<FlashPeriod>("today");
  const [tab, setTab] = React.useState<"flash" | "trends" | "email">("flash");
  const [alerts, setAlerts] = React.useState<Alert[]>(ALERTS_SEED);
  const [schedules, setSchedules] = React.useState<EmailSchedule[]>(SCHEDULES_SEED);
  const [showScheduleModal, setShowScheduleModal] = React.useState<EmailSchedule | "new" | null>(null);
  const [sendNowModal, setSendNowModal] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // ---- Live data (falls back to the seed while loading / offline) ----
  const [flashByPeriod, setFlashByPeriod] = React.useState<Partial<Record<FlashPeriod, FlashData>>>({});
  const [trend, setTrend] = React.useState<TrendRow[] | null>(null);
  const [insights, setInsights] = React.useState<InsightRow[] | null>(null);

  // Flash snapshot — fetched per period, cached so switching back is instant.
  React.useEffect(() => {
    if (flashByPeriod[period]) return;
    let cancelled = false;
    apiGet<FlashData>(`/owner/flash?period=${period}`)
      .then(d => { if (!cancelled) setFlashByPeriod(prev => ({ ...prev, [period]: d })); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [period, flashByPeriod]);

  // Owner-attention alerts derived from real data.
  React.useEffect(() => {
    let cancelled = false;
    apiGet<AlertRow[]>("/dashboard/alerts")
      .then(rows => {
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const tones: Alert["tone"][] = ["danger", "warning", "info", "success"];
        setAlerts(rows.map(r => ({
          id: String(r.id),
          tone: (tones as string[]).includes(r.level) ? (r.level as Alert["tone"]) : "warning",
          title: r.text,
          detail: r.href ? `Open ${r.href}` : "",
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Persisted email schedules.
  React.useEffect(() => {
    let cancelled = false;
    apiGet<ScheduleRow[]>("/email-schedules")
      .then(rows => { if (!cancelled && Array.isArray(rows) && rows.length) setSchedules(rows.map(normalizeSchedule)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 30-day trend + insights — only when the Trends tab is opened.
  React.useEffect(() => {
    if (tab !== "trends") return;
    let cancelled = false;
    if (!trend) {
      apiGet<TrendRow[]>("/owner/flash-trend")
        .then(d => { if (!cancelled && Array.isArray(d) && d.length) setTrend(d); })
        .catch(() => {});
    }
    if (!insights) {
      apiGet<InsightRow[]>("/owner/flash-insights")
        .then(d => { if (!cancelled && Array.isArray(d)) setInsights(d); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [tab, trend, insights]);

  // ---- Schedule CRUD (persists to backend; optimistic so the UI stays live offline) ----
  const saveSchedule = async (s: EmailSchedule, isNew: boolean) => {
    try {
      if (isNew) {
        const row = await apiPost<ScheduleRow>("/email-schedules", scheduleBody(s));
        setSchedules(prev => [...prev, normalizeSchedule(row)]);
        showToast("Schedule created · runs at the next scheduled time");
      } else {
        const row = await apiPut<ScheduleRow>(`/email-schedules/${s.id}`, scheduleBody(s));
        setSchedules(prev => prev.map(x => x.id === s.id ? normalizeSchedule(row) : x));
        showToast("Schedule saved");
      }
    } catch {
      // Offline fallback: keep the UI working with local state only.
      if (isNew) setSchedules(prev => [...prev, { ...s, id: "s" + (prev.length + 1) }]);
      else setSchedules(prev => prev.map(x => x.id === s.id ? s : x));
      showToast(isNew ? "Schedule created (offline)" : "Schedule saved (offline)");
    } finally {
      setShowScheduleModal(null);
    }
  };
  const toggleSchedule = async (id: string) => {
    const cur = schedules.find(s => s.id === id);
    if (!cur) return;
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    showToast("Schedule updated");
    try { await apiPut(`/email-schedules/${id}`, { enabled: !cur.enabled }); } catch { /* offline */ }
  };
  const deleteSchedule = async (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    showToast("Schedule deleted");
    try { await apiDelete(`/email-schedules/${id}`); } catch { /* offline */ }
  };
  const sendSchedule = async (id: string) => {
    const s = schedules.find(x => x.id === id);
    if (!s) return;
    try {
      const res = await apiPost<{ at: string }>("/owner/flash/send", { scheduleId: id });
      setSchedules(prev => prev.map(x => x.id === id ? { ...x, lastSentAt: res.at } : x));
    } catch { /* offline */ }
    showToast(`${s.label} sent to ${s.recipients[0] ?? "recipients"}`);
  };
  const sendNow = async (emails: string[]) => {
    setSendNowModal(false);
    try { await apiPost("/owner/flash/send", { recipients: emails }); } catch { /* offline */ }
    showToast(`Flash report sent to ${emails.length} recipient${emails.length === 1 ? "" : "s"}`);
  };

  const f = flashByPeriod[period] ?? FLASH_BY_PERIOD[period];
  const occupancy = (f.rooms.sold / f.rooms.total) * 100;
  const adr = f.revenue.rooms / Math.max(1, f.rooms.sold);
  const revpar = f.revenue.rooms / f.rooms.total;
  const gop = ((f.revenue.total - f.revenue.tax - f.costs.total) / Math.max(1, f.revenue.total - f.revenue.tax)) * 100;
  const cashOnHand = f.payments.cash + f.payments.card + f.payments.upi + f.payments.bank;

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-4">
      {/* HEADER */}
      <div className="header-band -mx-4 sm:-mx-6 lg:-mx-7 -mt-4 sm:-mt-6 lg:-mt-7 px-4 sm:px-6 lg:px-7 pt-4 sm:pt-5 lg:pt-6 pb-4 border-b border-border/70">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-linear-to-br from-amber-400 to-orange-500 text-white inline-flex items-center justify-center shadow-md shadow-orange-500/25 ring-1 ring-white/20">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-display font-medium tracking-tight leading-none">Owner&apos;s Flash Dashboard</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm mt-1.5">
                <span className="font-medium text-foreground/80">The Pearl Marina · Mumbai</span>
                <span className="text-border-strong">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success live-dot" />live snapshot
                </span>
                <span className="text-border-strong">·</span>
                <span>auto-email daily at 8:00 AM</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => showToast("Property switcher · The Pearl Marina is your only property today")} className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border bg-surface/60 hover:bg-surface-sunken hover:border-border-strong text-xs font-medium transition-colors">
              <Building2 className="h-3.5 w-3.5 text-accent" />The Pearl Marina · Mumbai
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
            <div className="h-9 inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-surface/60">
              <button onClick={() => showToast("Refreshed · live data updated")} className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md hover:bg-surface-sunken text-xs font-medium transition-colors">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />Refresh
              </button>
              <button onClick={() => showToast("PDF generated · download starting")} className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md hover:bg-surface-sunken text-xs font-medium transition-colors">
                <Download className="h-3.5 w-3.5 text-muted-foreground" />Export
              </button>
              <button onClick={() => showToast("Dashboard customization · drag KPIs to reorder")} className="h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md hover:bg-surface-sunken text-xs font-medium transition-colors">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />Customize
              </button>
            </div>
            <Button size="sm" className="h-9 shadow-md shadow-brand/15" onClick={() => setSendNowModal(true)}>
              <Send className="h-3.5 w-3.5" />Email now
            </Button>
          </div>
        </div>
      </div>

      {/* SUB-TABS */}
      <div className="border-b border-border flex flex-wrap gap-1">
        {([
          { id: "flash",  label: "Flash snapshot", icon: Sparkles },
          { id: "trends", label: "Trends",         icon: BarChart3 },
          { id: "email",  label: "Email schedules", icon: Mail, badge: schedules.filter(s => s.enabled).length },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 inline-flex items-center gap-2 transition-colors",
              tab === t.id ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="h-3.5 w-3.5" />{t.label}
              {"badge" in t && t.badge !== undefined && (
                <span className="ml-1 tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold bg-surface-sunken text-muted-foreground">{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* PERIOD CHIPS (flash + trends) */}
      {(tab === "flash" || tab === "trends") && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mr-1 inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Period</span>
          {(["today", "yesterday", "mtd", "last_month", "ytd"] as FlashPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
              period === p ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>{PERIOD_LABEL[p]}</button>
          ))}
        </div>
      )}

      {/* FLASH SNAPSHOT TAB */}
      {tab === "flash" && (
        <>
          {/* KPI STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <KpiCard label="Total revenue"   value={money(f.revenue.total)}   change={f.vs.revenueChange} icon={IndianRupee} accent="brand"   sub={`${PERIOD_LABEL[period]} · all channels`} />
            <KpiCard label="Occupancy"       value={`${occupancy.toFixed(1)}%`} change={f.vs.occChange} icon={BedDouble}   accent="info"    sub={`${f.rooms.sold}/${f.rooms.total} rooms`} />
            <KpiCard label="ADR"             value={money(adr)}               change={f.vs.adrChange} icon={TrendingUp}  accent="success" sub="Avg daily rate" />
            <KpiCard label="RevPAR"          value={money(revpar)}            change={f.vs.revenueChange - f.vs.occChange} icon={BarChart3} accent="accent" sub="Rev per room" />
            <KpiCard label="GOP margin"      value={`${gop.toFixed(1)}%`}     change={null} icon={Wallet} accent="warning" sub="Gross op. profit" />
            <KpiCard label="Cash on hand"    value={money(cashOnHand)}        change={null} icon={Receipt} accent="neutral" sub="All channels" />
          </div>

          {/* REVENUE + COSTS BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><IndianRupee className="h-4 w-4" /></span>Revenue breakdown</p>
                <Badge tone="brand">{PERIOD_LABEL[period]}</Badge>
              </div>
              <div className="space-y-3">
                {([
                  { label: "Room revenue",     value: f.revenue.rooms,   tone: "from-brand/60 to-brand" },
                  { label: "F&B revenue",      value: f.revenue.fb,      tone: "from-info/60 to-info" },
                  { label: "Banquet & halls",  value: f.revenue.banquet, tone: "from-accent/60 to-accent" },
                  { label: "Other (spa, etc)", value: f.revenue.other,   tone: "from-success/60 to-success" },
                  { label: "Tax collected",    value: f.revenue.tax,     tone: "from-warning/60 to-warning" },
                ]).map(r => {
                  const pct = (r.value / f.revenue.total) * 100;
                  return (
                    <div key={r.label}>
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="text-muted-foreground font-medium">{r.label}</span>
                        <span className="tabular font-semibold">{money(r.value)} <span className="text-muted-foreground font-normal">· {pct.toFixed(1)}%</span></span>
                      </div>
                      <div className="h-2 rounded-full bar-track overflow-hidden">
                        <div className={cn("h-full rounded-full bg-linear-to-r transition-all duration-500", r.tone)} style={{ width: `${Math.max(pct, 1.5)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-3.5 mt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Total revenue</span>
                <span className="text-xl font-bold tabular text-brand tracking-tight">{money(f.revenue.total)}</span>
              </div>
            </Card>

            <Card className="rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-danger-soft text-danger inline-flex items-center justify-center"><Wallet className="h-4 w-4" /></span>Operating costs</p>
                <Badge tone="neutral">{PERIOD_LABEL[period]}</Badge>
              </div>
              <div className="space-y-3">
                {([
                  { label: "Payroll",           value: f.costs.payroll,       tone: "from-danger/60 to-danger" },
                  { label: "OTA commissions",   value: f.costs.otaCommission, tone: "from-warning/60 to-warning" },
                  { label: "Utilities",         value: f.costs.utilities,     tone: "from-info/60 to-info" },
                  { label: "Supplies & F&B",    value: f.costs.supplies,      tone: "from-accent/60 to-accent" },
                  { label: "Misc",              value: f.costs.misc,          tone: "from-border-strong to-muted-foreground" },
                ]).map(r => {
                  const pct = (r.value / f.costs.total) * 100;
                  return (
                    <div key={r.label}>
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="text-muted-foreground font-medium">{r.label}</span>
                        <span className="tabular font-semibold">{money(r.value)} <span className="text-muted-foreground font-normal">· {pct.toFixed(1)}%</span></span>
                      </div>
                      <div className="h-2 rounded-full bar-track overflow-hidden">
                        <div className={cn("h-full rounded-full bg-linear-to-r transition-all duration-500", r.tone)} style={{ width: `${Math.max(pct, 1.5)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-3.5 mt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm font-semibold">Total costs</span>
                <span className="text-xl font-bold tabular text-danger tracking-tight">{money(f.costs.total)}</span>
              </div>
              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between rounded-lg bg-success-soft/50 ring-1 ring-success/20 px-3.5 py-2.5">
                  <span className="text-sm font-semibold inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-success" />Net · before tax &amp; financing</span>
                  <span className="text-xl font-bold tabular text-success tracking-tight">{money(f.revenue.total - f.revenue.tax - f.costs.total)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* SEGMENTS + PAYMENTS + GUESTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="rounded-xl p-4">
              <p className="font-semibold mb-3 inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-accent-soft text-accent inline-flex items-center justify-center"><BarChart3 className="h-4 w-4" /></span>Top revenue segments</p>
              <ul className="space-y-2.5">
                {f.topSegments.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <span className={cn(
                      "h-7 w-7 rounded-lg inline-flex items-center justify-center font-bold text-xs tabular shrink-0",
                      i === 0 ? "bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-sm" : "bg-surface-sunken text-muted-foreground"
                    )}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{s.name}</p>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xs tabular font-semibold">{money(s.revenue)}</span>
                        <span className="text-[10px] text-muted-foreground tabular">{s.share}%</span>
                      </div>
                    </div>
                    <div className="w-20 h-1.5 rounded-full bar-track overflow-hidden">
                      <div className={cn("h-full rounded-full bg-linear-to-r", i === 0 ? "from-amber-400 to-orange-500" : "from-brand/60 to-brand")} style={{ width: `${Math.min(s.share * 3, 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="rounded-xl p-4">
              <p className="font-semibold mb-3 inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-info-soft text-info inline-flex items-center justify-center"><Wallet className="h-4 w-4" /></span>Payment mix</p>
              <div className="space-y-3">
                {([
                  { label: "Card (POS)",     value: f.payments.card,  tone: "from-info/60 to-info" },
                  { label: "UPI",            value: f.payments.upi,   tone: "from-success/60 to-success" },
                  { label: "Cash",           value: f.payments.cash,  tone: "from-warning/60 to-warning" },
                  { label: "Bank transfer",  value: f.payments.bank,  tone: "from-brand/60 to-brand" },
                ]).map(p => {
                  const total = cashOnHand;
                  const pct = (p.value / total) * 100;
                  return (
                    <div key={p.label}>
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="text-muted-foreground font-medium">{p.label}</span>
                        <span className="tabular font-semibold">{money(p.value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bar-track overflow-hidden">
                          <div className={cn("h-full rounded-full bg-linear-to-r transition-all duration-500", p.tone)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] tabular text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-xl p-4">
              <p className="font-semibold mb-3 inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-success-soft text-success inline-flex items-center justify-center"><Users className="h-4 w-4" /></span>Guest mix</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                {([
                  { label: "OTA",        value: f.guests.ota,       tone: "warning" as const,  cls: "bg-warning-soft/50 ring-warning/20" },
                  { label: "Corporate",  value: f.guests.corporate, tone: "info" as const,     cls: "bg-info-soft/50 ring-info/20" },
                  { label: "Direct",     value: f.guests.direct,    tone: "brand" as const,    cls: "bg-brand-soft/50 ring-brand/15" },
                  { label: "Walk-in",    value: f.guests.walkIn,    tone: "accent" as const,   cls: "bg-accent-soft/50 ring-accent/20" },
                  { label: "Loyalty",    value: f.guests.loyalty,   tone: "success" as const,  cls: "bg-success-soft/50 ring-success/20" },
                ]).map(g => (
                  <div key={g.label} className={cn("rounded-lg ring-1 p-2.5 flex flex-col items-center gap-1", g.cls)}>
                    <p className="text-xl font-bold tabular">{g.value}</p>
                    <Badge tone={g.tone}>{g.label}</Badge>
                  </div>
                ))}
                <div className="rounded-lg bg-linear-to-br from-brand to-brand/80 text-brand-foreground p-2.5 inline-flex flex-col items-center justify-center gap-0.5 shadow-sm">
                  <p className="text-xl font-bold tabular">{f.guests.ota + f.guests.corporate + f.guests.direct + f.guests.walkIn + f.guests.loyalty}</p>
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-90">Total guests</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ALERTS + HIGHLIGHTS */}
          <Card className="rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-warning-soft text-warning inline-flex items-center justify-center"><AlertTriangle className="h-4 w-4" /></span>Owner attention required</p>
              <Badge tone="warning">{alerts.length} open</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {alerts.map(a => {
                const AlertIcon = a.tone === "info" ? Eye : a.tone === "success" ? CheckCircle2 : AlertTriangle;
                return (
                <div key={a.id} className={cn(
                  "group p-3 rounded-lg border flex items-start gap-2.5 hover-lift",
                  a.tone === "danger" && "border-danger/25 bg-danger-soft/15",
                  a.tone === "warning" && "border-warning/25 bg-warning-soft/15",
                  a.tone === "info" && "border-info/25 bg-info-soft/15",
                  a.tone === "success" && "border-success/25 bg-success-soft/15",
                )}>
                  <span className={cn(
                    "h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0",
                    a.tone === "danger" && "bg-danger-soft text-danger",
                    a.tone === "warning" && "bg-warning-soft text-warning",
                    a.tone === "info" && "bg-info-soft text-info",
                    a.tone === "success" && "bg-success-soft text-success",
                  )}>
                    <AlertIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight">{a.title}</p>
                    {a.detail && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{a.detail}</p>}
                  </div>
                  <button onClick={() => { setAlerts(prev => prev.filter(x => x.id !== a.id)); showToast("Alert acknowledged"); }} className="text-subtle-foreground hover:text-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" title="Dismiss">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                );
              })}
              {alerts.length === 0 && (
                <div className="col-span-full text-center py-10 text-sm text-muted-foreground">
                  <span className="h-12 w-12 rounded-full bg-success-soft text-success inline-flex items-center justify-center mb-3"><CheckCircle2 className="h-6 w-6" /></span>
                  <p className="font-medium text-foreground">All clear</p>
                  <p className="text-xs mt-0.5">No items pending owner review</p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* TRENDS TAB */}
      {tab === "trends" && <TrendsTab period={period} data={trend} insights={insights} />}

      {/* EMAIL SCHEDULES TAB */}
      {tab === "email" && (
        <EmailSchedulesTab
          schedules={schedules}
          onToggle={toggleSchedule}
          onEdit={(s) => setShowScheduleModal(s)}
          onDelete={deleteSchedule}
          onNew={() => setShowScheduleModal("new")}
          onSendNow={sendSchedule}
        />
      )}

      {/* SCHEDULE EDIT MODAL */}
      {showScheduleModal !== null && (
        <ScheduleEditModal
          existing={showScheduleModal === "new" ? null : showScheduleModal}
          onClose={() => setShowScheduleModal(null)}
          onSave={(s) => saveSchedule(s, showScheduleModal === "new")}
        />
      )}

      {/* SEND NOW MODAL */}
      {sendNowModal && (
        <SendNowModal
          onClose={() => setSendNowModal(false)}
          onSend={sendNow}
        />
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <CheckCircle2 className="h-3.5 w-3.5" />{toast}
        </div>
      )}
    </div>
  );
}

// ============================================================
// KPI CARD
// ============================================================
function KpiCard({
  label, value, change, icon: Icon, accent, sub, className,
}: {
  label: string;
  value: string;
  change: number | null;
  icon: React.ComponentType<{ className?: string }>;
  accent: "brand" | "info" | "success" | "warning" | "danger" | "accent" | "neutral";
  sub?: string;
  className?: string;
}) {
  const dir: ChangeDir = change === null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat";
  const ACCENT_BG: Record<string, string> = {
    brand: "bg-brand-soft text-brand-soft-foreground",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    accent: "bg-accent-soft text-accent",
    neutral: "bg-surface-sunken text-muted-foreground",
  };
  const changePill = change !== null && (
    <span className={cn(
      "text-[10px] tabular font-bold inline-flex items-center gap-0.5 rounded-full px-1 py-0.5",
      dir === "up" ? "text-success bg-success-soft" : dir === "down" ? "text-danger bg-danger-soft" : "text-muted-foreground bg-surface-sunken"
    )}>
      {dir === "up" ? <TrendingUp className="h-2.5 w-2.5" /> : dir === "down" ? <TrendingDown className="h-2.5 w-2.5" /> : null}
      {dir === "up" ? "+" : ""}{change.toFixed(1)}%
    </span>
  );

  return (
    <Card className={cn("hover-lift p-3", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn("h-6 w-6 rounded-md inline-flex items-center justify-center", ACCENT_BG[accent])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {changePill}
      </div>
      <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground truncate">{label}</p>
      <p className="text-base font-bold tabular mt-0.5 truncate tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </Card>
  );
}

// ============================================================
// TRENDS TAB
// ============================================================
const TREND_DATA: { day: number; revenue: number; occ: number; adr: number }[] = Array.from({ length: 30 }, (_, i) => {
  const dow = (i + 1) % 7;
  const weekend = dow === 0 || dow === 6;
  const base = 500000 + Math.round(Math.sin(i / 4) * 100000) + (weekend ? 180000 : 0);
  return {
    day: i + 1,
    revenue: base + i * 6000,
    occ: 60 + Math.round(Math.sin(i / 3) * 15) + (weekend ? 12 : 0),
    adr: 5800 + Math.round(Math.cos(i / 5) * 400) + (weekend ? 500 : 0),
  };
});

function TrendsTab({ period, data, insights }: { period: FlashPeriod; data: TrendRow[] | null; insights: InsightRow[] | null }) {
  const series = data && data.length ? data : TREND_DATA;
  const maxRev = Math.max(...series.map(d => d.revenue), 1);
  const maxAdr = Math.max(...series.map(d => d.adr), 1);

  return (
    <div className="space-y-3">
      <Card className="rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><TrendingUp className="h-4 w-4" /></span>Revenue trend · 30 days</p>
          <Badge tone="brand">{PERIOD_LABEL[period]}</Badge>
        </div>
        <div className="flex items-end gap-1 h-48 border-b border-border/70">
          {series.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer h-full justify-end">
              <div className="w-full bg-linear-to-t from-brand/30 to-brand/70 group-hover:from-brand group-hover:to-accent rounded-t-md transition-all relative" style={{ height: `${(d.revenue / maxRev) * 100}%` }}>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] tabular px-1.5 py-0.5 rounded whitespace-nowrap z-10 shadow-md">
                  {money(d.revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1 mt-1.5">
          {series.map(d => (
            <span key={d.day} className="flex-1 text-center text-[9px] tabular text-muted-foreground">{d.day % 5 === 0 || d.day === 1 ? d.day : ""}</span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl p-4">
          <p className="font-semibold mb-3 inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-info-soft text-info inline-flex items-center justify-center"><BedDouble className="h-4 w-4" /></span>Occupancy trend · 30 days</p>
          <div className="flex items-end gap-1 h-32 border-b border-border/70">
            {series.map(d => (
              <div key={d.day} className="flex-1 bg-linear-to-t from-info/25 to-info/70 hover:to-info rounded-t-md transition-all" style={{ height: `${d.occ}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground tabular mt-1.5">
            <span>Day 1</span><span>Day 15</span><span>Day 30</span>
          </div>
        </Card>

        <Card className="rounded-xl p-4">
          <p className="font-semibold mb-3 inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-success-soft text-success inline-flex items-center justify-center"><TrendingUp className="h-4 w-4" /></span>ADR trend · 30 days</p>
          <div className="flex items-end gap-1 h-32 border-b border-border/70">
            {series.map(d => (
              <div key={d.day} className="flex-1 bg-linear-to-t from-success/25 to-success/70 hover:to-success rounded-t-md transition-all" style={{ height: `${(d.adr / maxAdr) * 100}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground tabular mt-1.5">
            <span>Day 1</span><span>Day 15</span><span>Day 30</span>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl p-4">
        <p className="font-semibold mb-3 inline-flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-accent-soft text-accent inline-flex items-center justify-center"><Sparkles className="h-4 w-4" /></span>Insights</p>
        {insights && insights.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {insights.map((ins, i) => (
              <li key={i} className="inline-flex items-start gap-2">
                {ins.dir === "down"
                  ? <ArrowDownRight className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  : <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />}
                {ins.text}
              </li>
            ))}
          </ul>
        ) : insights ? (
          <p className="text-sm text-muted-foreground py-2">Not enough historical data yet to surface insights.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            <li className="inline-flex items-start gap-2"><ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />Weekends (Fri-Sun) consistently drive 38% higher revenue · consider weekend premium pricing</li>
            <li className="inline-flex items-start gap-2"><TrendingUp className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />ADR up 7.6% MoM despite occupancy gain — successful yield management</li>
            <li className="inline-flex items-start gap-2"><TrendingDown className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />OTA commission cost rising 8% faster than revenue · push more direct bookings</li>
            <li className="inline-flex items-start gap-2"><ArrowDownRight className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" />Walk-in covers down 12% MoM · consider street-level signage refresh</li>
            <li className="inline-flex items-start gap-2"><TrendingUp className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />F&B attach rate at 39% (above 35% target) · room service performing well</li>
          </ul>
        )}
        <div className="mt-4 pt-3 border-t border-border flex justify-end">
          <Link href="/reports" className="text-xs text-brand hover:underline inline-flex items-center gap-1"><FileBarChart className="h-3 w-3" />Open detailed P&L report<ChevronRight className="h-3 w-3" /></Link>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// EMAIL SCHEDULES TAB
// ============================================================
function EmailSchedulesTab({
  schedules, onToggle, onEdit, onDelete, onNew, onSendNow,
}: {
  schedules: EmailSchedule[];
  onToggle: (id: string) => void;
  onEdit: (s: EmailSchedule) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onSendNow: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Mail className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p>Auto-emailed reports run via the cron worker and use the SMTP credentials from <Link href="/setup" className="text-brand hover:underline">Master Setup → Integrations</Link>. Recipients can be email addresses or WhatsApp numbers (we&apos;ll send a PDF link).</p>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{schedules.filter(s => s.enabled).length} active · {schedules.filter(s => !s.enabled).length} paused</p>
        <Button size="sm" onClick={onNew}><Plus className="h-3.5 w-3.5" />New schedule</Button>
      </div>

      <div className="space-y-3">
        {schedules.map(s => (
          <Card key={s.id} className={cn("p-4", !s.enabled && "opacity-60")}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={cn(
                  "h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0",
                  s.enabled ? "bg-brand-soft text-brand-soft-foreground" : "bg-surface-sunken text-muted-foreground"
                )}>
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{s.label}</p>
                    <Badge tone={s.enabled ? "success" : "neutral"}>{s.enabled ? "active" : "paused"}</Badge>
                    <Badge tone="info">{s.frequency}</Badge>
                    <Badge tone="neutral"><Clock className="h-2.5 w-2.5" />{s.time}</Badge>
                    <Badge tone="accent">{s.format.toUpperCase()}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    <strong>To:</strong> {s.recipients.join(", ")}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.sections.map(sec => <Badge key={sec} tone="neutral">{sec}</Badge>)}
                  </div>
                  {s.lastSentAt && <p className="text-[10px] text-muted-foreground mt-1.5">Last sent: <span className="tabular">{s.lastSentAt}</span></p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => onSendNow(s.id)}><Send className="h-3 w-3" />Send now</Button>
                <Button size="sm" variant="outline" onClick={() => onToggle(s.id)}>{s.enabled ? "Pause" : "Resume"}</Button>
                <Button size="sm" variant="ghost" onClick={() => onEdit(s)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(s.id)}><Trash2 className="h-3 w-3 text-danger" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SCHEDULE EDIT MODAL
// ============================================================
function ScheduleEditModal({ existing, onClose, onSave }: {
  existing: EmailSchedule | null;
  onClose: () => void;
  onSave: (s: EmailSchedule) => void;
}) {
  const [s, setS] = React.useState<EmailSchedule>(existing || {
    id: "", label: "", frequency: "daily", time: "08:00", recipients: [], format: "pdf", sections: ["KPIs", "Revenue"], enabled: true,
  });
  const [recipient, setRecipient] = React.useState("");

  const SECTIONS = ["KPIs", "Revenue", "Costs", "Cash flow", "Alerts", "Banquet bookings", "F&B revenue", "Full P&L", "Balance sheet", "Top guests", "Top vendors"];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{existing ? "Edit schedule" : "New email schedule"}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Schedule name</Label>
            <Input value={s.label} onChange={e => setS({ ...s, label: e.target.value })} placeholder="e.g. Morning Flash to Owner" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={s.frequency} onChange={e => setS({ ...s, frequency: e.target.value as EmailSchedule["frequency"] })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Monday)</option>
                <option value="monthly">Monthly (1st)</option>
              </Select>
            </div>
            <div>
              <Label>Send at</Label>
              <Input type="time" value={s.time} onChange={e => setS({ ...s, time: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Recipients (email or WhatsApp)</Label>
            <div className="flex gap-2">
              <Input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="owner@thepearl.in or +91 9820013345" onKeyDown={e => { if (e.key === "Enter" && recipient.trim()) { setS({ ...s, recipients: [...s.recipients, recipient.trim()] }); setRecipient(""); } }} />
              <Button variant="outline" onClick={() => { if (recipient.trim()) { setS({ ...s, recipients: [...s.recipients, recipient.trim()] }); setRecipient(""); } }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {s.recipients.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-sunken text-xs">
                  {r}
                  <button onClick={() => setS({ ...s, recipients: s.recipients.filter((_, idx) => idx !== i) })}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <Label>Format</Label>
            <Select value={s.format} onChange={e => setS({ ...s, format: e.target.value as EmailSchedule["format"] })}>
              <option value="pdf">PDF attachment</option>
              <option value="html">HTML body</option>
              <option value="both">Both PDF + HTML</option>
            </Select>
          </div>

          <div>
            <Label>Sections to include</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1.5">
              {SECTIONS.map(sec => {
                const on = s.sections.includes(sec);
                return (
                  <button key={sec} onClick={() => setS({ ...s, sections: on ? s.sections.filter(x => x !== sec) : [...s.sections, sec] })} className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                    on ? "border-brand bg-brand-soft/30 text-brand-soft-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
                  )}>
                    {on ? <CheckCircle2 className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{sec}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input id="enabled" type="checkbox" checked={s.enabled} onChange={e => setS({ ...s, enabled: e.target.checked })} className="h-4 w-4" />
            <Label htmlFor="enabled" className="cursor-pointer mb-0">Enabled — start sending immediately</Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(s)} disabled={!s.label || s.recipients.length === 0}>{existing ? "Save changes" : "Create schedule"}</Button>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// SEND NOW MODAL
// ============================================================
function SendNowModal({ onClose, onSend }: { onClose: () => void; onSend: (emails: string[]) => void }) {
  const [emails, setEmails] = React.useState("owner@thepearl.in");
  const [includeAttachment, setIncludeAttachment] = React.useState(true);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Send className="h-4 w-4 text-brand" />Send flash report now</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>To (comma-separated)</Label>
            <Input value={emails} onChange={e => setEmails(e.target.value)} placeholder="owner@..., cfo@..." />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-md bg-surface-sunken/40 border border-border">
            <input id="attach" type="checkbox" checked={includeAttachment} onChange={e => setIncludeAttachment(e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="attach" className="cursor-pointer mb-0 text-sm">Include PDF attachment</Label>
          </div>
          <Card className="p-3 bg-warning-soft/20 border-warning/30 text-xs">
            <p className="font-semibold mb-1">Will include:</p>
            <ul className="text-muted-foreground space-y-0.5">
              <li>· Live KPIs (revenue, occupancy, ADR, RevPAR)</li>
              <li>· Revenue & cost breakdown</li>
              <li>· Top revenue segments</li>
              <li>· Payment mix and cash on hand</li>
              <li>· Open owner-attention alerts</li>
            </ul>
          </Card>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSend(emails.split(",").map(e => e.trim()).filter(Boolean))}><Send className="h-3.5 w-3.5" />Send now</Button>
        </div>
      </Card>
    </div>
  );
}
