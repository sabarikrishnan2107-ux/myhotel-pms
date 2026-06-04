"use client";
import * as React from "react";
import Link from "next/link";
import {
  Bell, BedDouble, CreditCard, Sparkles, Wrench, Crown, Settings, Shield, Megaphone,
  Mail, MessageCircle, Send, Plus, Edit, Eye, CheckCircle2, AlertCircle, CheckCheck,
  Clock, X, Search, Volume2, VolumeX, Smartphone, Monitor, Moon, Trash2, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { NOTIF_TEMPLATES, NOTIF_LOG } from "@/lib/mock-data-ext";
import { cn } from "@/lib/utils";
import {
  useNotifications, relativeTime, timeBucket, CATEGORY_META, PRIORITY_TONE,
  type NotifCategory, type NotifPriority,
} from "@/components/notifications/store";

const CHANNEL_ICON = { Email: Mail, WhatsApp: MessageCircle, Telegram: Send } as const;
const STATUS_TONE = { delivered: "success", opened: "info", bounced: "danger" } as const;
const CATEGORY_ICON: Record<NotifCategory, typeof Bell> = {
  booking: BedDouble, payment: CreditCard, housekeeping: Sparkles, maintenance: Wrench,
  guest: Crown, system: Settings, security: Shield, marketing: Megaphone,
};
const ALL_CATEGORIES: NotifCategory[] = ["booking", "payment", "housekeeping", "maintenance", "guest", "system", "security", "marketing"];
const TABS = ["inbox", "preferences", "templates", "log"] as const;
type TabId = typeof TABS[number];

export default function NotificationsPage() {
  const [tab, setTab] = React.useState<TabId>("inbox");
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inbox · channel preferences · templates · delivery log
          </p>
        </div>
        {tab === "templates" && <NewTemplateButton onToast={showToast} />}
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const labels: Record<TabId, string> = { inbox: "Inbox", preferences: "Preferences", templates: "Templates", log: "Delivery Log" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[t]}
              {t === "inbox" && <InboxBadge />}
            </button>
          );
        })}
      </div>

      {tab === "inbox" && <InboxTab onToast={showToast} />}
      {tab === "preferences" && <PreferencesTab onToast={showToast} />}
      {tab === "templates" && <TemplatesTab onToast={showToast} />}
      {tab === "log" && <LogTab />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// Live unread count on the Inbox tab label
function InboxBadge() {
  const { unreadCount } = useNotifications();
  if (unreadCount === 0) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center text-[10px] font-bold tabular bg-danger text-white rounded-full h-4 min-w-4 px-1">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}

// ============================================================
// INBOX TAB
// ============================================================
function InboxTab({ onToast }: { onToast: (m: string) => void }) {
  const { notifs, unreadCount, urgentCount, markRead, markAllRead, snooze, dismiss, refNow } = useNotifications();
  const [categoryFilter, setCategoryFilter] = React.useState<"all" | NotifCategory>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<"all" | NotifPriority>("all");
  const [showRead, setShowRead] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    return notifs.filter(n => {
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
      if (!showRead && n.read) return false;
      if (search && !`${n.title} ${n.message} ${n.actor ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [notifs, categoryFilter, priorityFilter, showRead, search]);

  // Group by time bucket
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, n) => {
    const bucket = timeBucket(n.createdAt, refNow);
    (acc[bucket] ??= []).push(n);
    return acc;
  }, {});
  const bucketLabels: Record<string, string> = { today: "Today", yesterday: "Yesterday", earlier: "Earlier this week" };
  const bucketOrder = ["today", "yesterday", "earlier"];

  // KPI counts (across all visible, not filtered)
  const totalCount = notifs.length;
  const today = notifs.filter(n => timeBucket(n.createdAt, refNow) === "today").length;
  const actionRequired = notifs.filter(n => !n.read && n.actionLabel).length;

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Unread" value={unreadCount} icon={Bell} accent={unreadCount === 0 ? "success" : urgentCount > 0 ? "danger" : "warning"} hint={urgentCount > 0 ? `${urgentCount} urgent` : "stay on top"} />
        <KPICard label="Action required" value={actionRequired} icon={AlertCircle} accent={actionRequired > 0 ? "warning" : "success"} hint="needs your attention" />
        <KPICard label="Today" value={today} icon={Clock} accent="info" />
        <KPICard label="Total" value={totalCount} icon={CheckCheck} accent="brand" hint="active notifications" />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setCategoryFilter("all")} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors",
            categoryFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            All categories
            <span className={cn(
              "ml-2 tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
              categoryFilter === "all" ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
            )}>{notifs.length}</span>
          </button>
          {ALL_CATEGORIES.map(c => {
            const count = notifs.filter(n => n.category === c).length;
            if (count === 0) return null;
            const meta = CATEGORY_META[c];
            const Icon = CATEGORY_ICON[c];
            return (
              <button key={c} onClick={() => setCategoryFilter(c)} className={cn(
                "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                categoryFilter === c ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
              )}>
                <Icon className="h-3 w-3" />{meta.label}
                <span className={cn(
                  "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                  categoryFilter === c ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + secondary filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications…" className="pl-9 h-9" />
          </div>
          <Select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as typeof priorityFilter)} className="h-9 w-auto text-xs">
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
          <button type="button" onClick={() => setShowRead(s => !s)} className={cn(
            "h-9 px-3 rounded-md text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
            showRead ? "border-border text-foreground hover:bg-surface-sunken" : "border-brand bg-brand-soft text-brand-soft-foreground"
          )}>
            <CheckCheck className="h-3.5 w-3.5" />{showRead ? "Showing read" : "Unread only"}
          </button>
          <div className="flex-1" />
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => { markAllRead(); onToast(`Marked ${unreadCount} as read`); }}>
              <CheckCheck className="h-3.5 w-3.5" />Mark all read
            </Button>
          )}
        </div>
      </Card>

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
          <p className="font-medium">No notifications match these filters</p>
          <p className="text-xs text-muted-foreground mt-1">Try clearing filters or check back later</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {bucketOrder.filter(b => grouped[b]).map(bucket => (
            <div key={bucket}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{bucketLabels[bucket]}</p>
                <p className="text-[10px] text-muted-foreground tabular">{grouped[bucket].length} item{grouped[bucket].length === 1 ? "" : "s"}</p>
              </div>
              <Card className="p-0 overflow-hidden">
                <ul className="divide-y divide-border">
                  {grouped[bucket].map(n => {
                    const meta = CATEGORY_META[n.category];
                    const Icon = CATEGORY_ICON[n.category];
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          "relative px-4 py-3.5 hover:bg-surface-sunken/30 transition-colors group",
                          !n.read && "bg-brand-soft/8",
                          n.priority === "urgent" && !n.read && "border-l-4 border-l-danger"
                        )}
                      >
                        {!n.read && (
                          <span className={cn(
                            "absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full",
                            n.priority === "urgent" ? "bg-danger animate-pulse" : "bg-brand"
                          )} />
                        )}
                        <div className="flex gap-3 ml-3">
                          <span className={cn(
                            "h-9 w-9 rounded-md inline-flex items-center justify-center shrink-0",
                            meta.tone === "brand" && "bg-brand-soft text-brand-soft-foreground",
                            meta.tone === "info" && "bg-info-soft text-info",
                            meta.tone === "warning" && "bg-warning-soft text-warning",
                            meta.tone === "danger" && "bg-danger-soft text-danger",
                            meta.tone === "success" && "bg-success-soft text-success",
                            meta.tone === "accent" && "bg-accent-soft text-accent",
                            meta.tone === "neutral" && "bg-surface-sunken text-muted-foreground",
                          )}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                                <Badge tone={meta.tone}>{meta.label}</Badge>
                                {n.priority !== "normal" && n.priority !== "low" && (
                                  <Badge tone={PRIORITY_TONE[n.priority]}>{n.priority}</Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground tabular shrink-0">{relativeTime(n.createdAt, refNow)}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {n.actor && <p className="text-[10px] text-muted-foreground italic mr-2">by {n.actor}</p>}
                              {n.actionHref && (
                                <Link
                                  href={n.actionHref}
                                  onClick={() => markRead(n.id)}
                                  className="h-7 px-2.5 rounded-md bg-brand text-brand-foreground text-xs font-medium hover:bg-brand/90 inline-flex items-center gap-1 transition-colors"
                                >
                                  {n.actionLabel || "View"}<ArrowRight className="h-3 w-3" />
                                </Link>
                              )}
                              <div className="flex-1" />
                              {!n.read && (
                                <button type="button" onClick={() => markRead(n.id)} className="h-7 px-2 rounded-md hover:bg-surface-sunken text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                  <CheckCheck className="h-3 w-3" />Mark read
                                </button>
                              )}
                              <SnoozeMenu onSnooze={(m) => { snooze(n.id, m); onToast(`Snoozed for ${m >= 60 ? m / 60 + "h" : m + "m"}`); }} />
                              <button type="button" onClick={() => { dismiss(n.id); onToast("Notification dismissed"); }} className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger text-muted-foreground inline-flex items-center justify-center" title="Dismiss">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SnoozeMenu({ onSnooze }: { onSnooze: (minutes: number) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} className="h-7 px-2 rounded-md hover:bg-surface-sunken text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />Snooze
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-md shadow-xl z-40 py-1 text-xs">
          {[{ l: "30 min", m: 30 }, { l: "1 hour", m: 60 }, { l: "3 hours", m: 180 }, { l: "Tomorrow", m: 60 * 18 }].map(o => (
            <button key={o.m} onClick={() => { onSnooze(o.m); setOpen(false); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left">{o.l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PREFERENCES TAB
// ============================================================
function PreferencesTab({ onToast }: { onToast: (m: string) => void }) {
  const { prefs, setChannelPref, toggleMute, setPref } = useNotifications();

  return (
    <div className="space-y-5">
      {/* Global toggles */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Sound</p>
            <p className="text-sm font-medium mt-1">Play a sound for new notifications</p>
          </div>
          <Toggle on={prefs.sound} onChange={v => { setPref("sound", v); onToast(`Sound ${v ? "on" : "off"}`); }} icon={prefs.sound ? Volume2 : VolumeX} />
        </div>
        <hr className="border-border" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Desktop notifications</p>
            <p className="text-sm font-medium mt-1">Show OS-level alerts when this tab is in background</p>
          </div>
          <Toggle on={prefs.desktop} onChange={v => { setPref("desktop", v); onToast(`Desktop alerts ${v ? "enabled" : "disabled"}`); }} icon={Monitor} />
        </div>
        <hr className="border-border" />
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1.5"><Moon className="h-3 w-3" />Quiet hours</p>
              <p className="text-sm font-medium mt-1">Silence non-urgent notifications during these hours</p>
            </div>
            <Toggle on={prefs.quietHoursEnabled} onChange={v => { setPref("quietHoursEnabled", v); onToast(`Quiet hours ${v ? "on" : "off"}`); }} />
          </div>
          {prefs.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="time" value={prefs.quietStart} onChange={e => setPref("quietStart", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Until</Label>
                <Input type="time" value={prefs.quietEnd} onChange={e => setPref("quietEnd", e.target.value)} className="h-9 tabular" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Per-category channels */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 bg-surface-elevated border-b border-border">
          <p className="text-sm font-semibold">Per-category channels</p>
          <p className="text-xs text-muted-foreground">Choose how you receive each notification type</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken/30 border-b border-border">
            <tr className="text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-5 py-2.5 font-semibold">Category</th>
              <th className="px-2 py-2.5 font-semibold inline-flex items-center gap-1"><Mail className="h-3 w-3" />Email</th>
              <th className="px-2 py-2.5 font-semibold inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />WhatsApp</th>
              <th className="px-2 py-2.5 font-semibold inline-flex items-center gap-1"><Smartphone className="h-3 w-3" />SMS</th>
              <th className="px-2 py-2.5 font-semibold inline-flex items-center gap-1"><Bell className="h-3 w-3" />Push</th>
              <th className="px-5 py-2.5 font-semibold text-right">Mute</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ALL_CATEGORIES.map(c => {
              const meta = CATEGORY_META[c];
              const Icon = CATEGORY_ICON[c];
              const muted = prefs.mutedCategories.includes(c);
              return (
                <tr key={c} className={cn("hover:bg-surface-sunken/30", muted && "opacity-50")}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-8 w-8 rounded-md inline-flex items-center justify-center shrink-0",
                        meta.tone === "brand" && "bg-brand-soft text-brand-soft-foreground",
                        meta.tone === "info" && "bg-info-soft text-info",
                        meta.tone === "warning" && "bg-warning-soft text-warning",
                        meta.tone === "danger" && "bg-danger-soft text-danger",
                        meta.tone === "success" && "bg-success-soft text-success",
                        meta.tone === "accent" && "bg-accent-soft text-accent",
                        meta.tone === "neutral" && "bg-surface-sunken text-muted-foreground",
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <p className="font-medium">{meta.label}</p>
                    </div>
                  </td>
                  {(["email", "whatsapp", "sms", "push"] as const).map(ch => (
                    <td key={ch} className="px-2 py-3 text-center">
                      <ChannelTick
                        on={prefs.channels[c][ch]}
                        disabled={muted}
                        onChange={v => setChannelPref(c, ch, v)}
                      />
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => { toggleMute(c); onToast(`${meta.label} ${muted ? "unmuted" : "muted"}`); }} className={cn(
                      "h-7 px-2 rounded-md border text-xs font-medium transition-colors inline-flex items-center gap-1",
                      muted ? "border-danger text-danger bg-danger-soft/30" : "border-border text-muted-foreground hover:bg-surface-sunken"
                    )}>
                      {muted ? <><VolumeX className="h-3 w-3" />Muted</> : <><Volume2 className="h-3 w-3" />Active</>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-4 bg-info-soft/15 border-info/30 text-xs">
        <p className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <span><strong>Tip:</strong> Security and urgent payment alerts are always delivered, regardless of quiet hours or mute settings. Compliance and audit notifications cannot be muted.</span>
        </p>
      </Card>
    </div>
  );
}

function Toggle({ on, onChange, icon: Icon }: { on: boolean; onChange: (v: boolean) => void; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={cn(
      "relative h-7 w-12 rounded-full transition-colors inline-flex items-center shrink-0",
      on ? "bg-brand" : "bg-surface-sunken"
    )} aria-label="Toggle">
      <span className={cn(
        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform inline-flex items-center justify-center text-foreground",
        on ? "translate-x-[22px]" : "translate-x-0.5"
      )}>
        {Icon && <Icon className="h-3 w-3" />}
      </span>
    </button>
  );
}

function ChannelTick({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className={cn(
      "h-6 w-6 rounded-md border-2 inline-flex items-center justify-center transition-colors mx-auto",
      disabled && "opacity-30 cursor-not-allowed",
      on ? "bg-brand border-brand text-brand-foreground" : "border-border hover:border-brand/50"
    )}>
      {on && <CheckCircle2 className="h-3 w-3" />}
    </button>
  );
}

// ============================================================
// TEMPLATES TAB — admin
// ============================================================
function NewTemplateButton({ onToast }: { onToast: (m: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New template</Button>
      {open && <TemplateEditorModal onClose={() => setOpen(false)} onSave={() => { setOpen(false); onToast("New template saved"); }} />}
    </>
  );
}

function TemplatesTab({ onToast }: { onToast: (m: string) => void }) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Active templates" value={NOTIF_TEMPLATES.length} icon={Mail} accent="brand" />
        <KPICard label="Sent today" value={37} icon={Send} accent="success" />
        <KPICard label="Delivery rate" value="98.4%" icon={CheckCircle2} accent="info" />
        <KPICard label="Bounced" value={2} icon={AlertCircle} accent="warning" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-elevated border-b border-border">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Template</th>
              <th className="px-4 py-3 font-semibold">Trigger</th>
              <th className="px-4 py-3 font-semibold">Channels</th>
              <th className="px-4 py-3 font-semibold">Today</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {NOTIF_TEMPLATES.map(t => (
              <tr key={t.id} className="hover:bg-surface-sunken/50 transition-colors">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.trigger}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {t.channels.map(c => {
                      const Icon = CHANNEL_ICON[c as keyof typeof CHANNEL_ICON];
                      return (
                        <span key={c} title={c} className="h-6 w-6 rounded-md bg-surface-sunken text-muted-foreground inline-flex items-center justify-center">
                          <Icon className="h-3 w-3" />
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.lastSent}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(t.id)}><Edit className="h-3.5 w-3.5" />Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editingId && (
        <TemplateEditorModal
          template={NOTIF_TEMPLATES.find(t => t.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={() => { setEditingId(null); onToast("Template updated"); }}
        />
      )}
    </div>
  );
}

function TemplateEditorModal({ template, onClose, onSave }: {
  template?: typeof NOTIF_TEMPLATES[number];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = React.useState(template?.name || "");
  const [trigger, setTrigger] = React.useState(template?.trigger || "On booking");
  const [channels, setChannels] = React.useState<string[]>(template?.channels || ["Email"]);
  const [subject, setSubject] = React.useState(template ? `Re: ${template.name}` : "");
  const [body, setBody] = React.useState(template
    ? `Hi {{guest_name}},\n\nThis is a {{template_name}} notification regarding your {{booking_no}}.\n\nWarm regards,\nThe Pearl Marina`
    : "Hi {{guest_name}},\n\n…\n\nWarm regards,\nThe Pearl Marina"
  );

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const toggleChannel = (c: string) => setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Mail className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">{template ? "Edit notification template" : "New notification template"}</h3>
              <p className="text-xs text-muted-foreground">Email · WhatsApp · Telegram · SMS</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Template name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pre-arrival Welcome" className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Trigger event *</Label>
            <Select value={trigger} onChange={e => setTrigger(e.target.value)} className="h-9">
              <option>On booking</option>
              <option>On advance payment</option>
              <option>1 day before arrival</option>
              <option>On check-in</option>
              <option>Morning of checkout</option>
              <option>On checkout</option>
              <option>1 day after checkout</option>
              <option>On cancellation</option>
              <option>On variance / alert</option>
              <option>Manual fire</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Delivery channels *</Label>
            <div className="grid grid-cols-4 gap-2">
              {(["Email", "WhatsApp", "SMS", "Telegram"] as const).map(c => {
                const Icon = c === "Email" ? Mail : c === "WhatsApp" ? MessageCircle : c === "SMS" ? Smartphone : Send;
                const on = channels.includes(c);
                return (
                  <button key={c} type="button" onClick={() => toggleChannel(c)} className={cn(
                    "h-10 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                    on ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                  )}>
                    <Icon className="h-3.5 w-3.5" />{c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Subject line</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your booking at The Pearl Marina" className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Body</Label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm font-mono focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y"
            />
            <p className="text-[10px] text-muted-foreground">
              Variables: <span className="font-mono">{"{{guest_name}}"}</span> · <span className="font-mono">{"{{booking_no}}"}</span> · <span className="font-mono">{"{{check_in}}"}</span> · <span className="font-mono">{"{{room_no}}"}</span> · <span className="font-mono">{"{{amount}}"}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          {template && (
            <Button variant="danger" size="sm" onClick={onSave}>
              <Trash2 className="h-3.5 w-3.5" />Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave} disabled={!name.trim() || channels.length === 0}>
              <CheckCircle2 className="h-3.5 w-3.5" />{template ? "Save changes" : "Create template"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DELIVERY LOG TAB
// ============================================================
function LogTab() {
  const [statusFilter, setStatusFilter] = React.useState<"all" | "delivered" | "opened" | "bounced">("all");
  const filtered = NOTIF_LOG.filter(l => statusFilter === "all" || l.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Delivered today" value={NOTIF_LOG.filter(l => l.status === "delivered" || l.status === "opened").length} icon={CheckCircle2} accent="success" />
        <KPICard label="Opened" value={NOTIF_LOG.filter(l => l.status === "opened").length} icon={Eye} accent="info" />
        <KPICard label="Bounced" value={NOTIF_LOG.filter(l => l.status === "bounced").length} icon={AlertCircle} accent="warning" />
        <KPICard label="Open rate" value={`${Math.round(NOTIF_LOG.filter(l => l.status === "opened").length / NOTIF_LOG.length * 100)}%`} icon={Eye} accent="brand" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "delivered", "opened", "bounced"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
            statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>{s} · {s === "all" ? NOTIF_LOG.length : NOTIF_LOG.filter(l => l.status === s).length}</button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Send className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No entries match this filter</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(l => {
                const Icon = CHANNEL_ICON[l.channel as keyof typeof CHANNEL_ICON];
                return (
                  <tr key={l.id} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground tabular">{l.time}</td>
                    <td className="px-4 py-3 font-medium">{l.to}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{l.channel}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{l.template}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge></td>
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
