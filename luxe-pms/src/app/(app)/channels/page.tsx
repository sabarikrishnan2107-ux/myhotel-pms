"use client";
import * as React from "react";
import {
  Globe, RefreshCw, Plus, Link2, Wifi, WifiOff, Calendar, Tag, Percent,
  ScrollText, CheckCircle2, AlertCircle, ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { money, cn } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type ChannelRow = { id: string; name: string; status: string; lastSync: string; bookings: number; commission: number; rev: number };

const STATUS_TONE = { connected: "success", syncing: "info", disconnected: "neutral" } as const;

const TABS = [
  { id: "connections", label: "Connections", icon: Wifi },
  { id: "bookings", label: "OTA Bookings", icon: Calendar },
  { id: "rates", label: "Rate Mapping", icon: Tag },
  { id: "availability", label: "Availability Sync", icon: Calendar },
  { id: "commissions", label: "Commissions", icon: Percent },
  { id: "logs", label: "Sync Logs", icon: ScrollText },
] as const;
type TabId = typeof TABS[number]["id"];

// Sample OTA bookings
type OtaBooking = { id: string; channel: string; booking: string; guest: string; room: string; checkIn: string; nights: number; status: "confirmed" | "pending" | "modified" | "cancelled"; total: number };
const OTA_BOOKINGS: OtaBooking[] = [
  { id: "ob1", channel: "Booking.com", booking: "BDC-44218", guest: "Hans Müller", room: "302", checkIn: "26 May", nights: 3, status: "confirmed", total: 2400 },
  { id: "ob2", channel: "Agoda", booking: "AGD-87124", guest: "Lin Cheng", room: "104", checkIn: "27 May", nights: 2, status: "confirmed", total: 1700 },
  { id: "ob3", channel: "Expedia", booking: "EXP-99841", guest: "Priya Reddy", room: "Pending", checkIn: "28 May", nights: 4, status: "pending", total: 3400 },
  { id: "ob4", channel: "Booking.com", booking: "BDC-44219", guest: "James OBrien", room: "405", checkIn: "25 May", nights: 1, status: "modified", total: 1200 },
  { id: "ob5", channel: "MakeMyTrip", booking: "MMT-31202", guest: "Arjun Patel", room: "208", checkIn: "29 May", nights: 5, status: "confirmed", total: 3850 },
];

const ROOM_TYPES = ["Queen", "Deluxe", "Suite", "King", "Family", "Executive"];

type RateMapRow = { type: string; pms: number; bdc: number; agoda: number; expedia: number };
const RATE_MAP: RateMapRow[] = ROOM_TYPES.map(t => ({
  type: t,
  pms: ({ Queen: 450, Deluxe: 650, Suite: 1200, King: 850, Family: 950, Executive: 1500 } as Record<string, number>)[t]!,
  bdc: ({ Queen: 480, Deluxe: 695, Suite: 1280, King: 905, Family: 1015, Executive: 1600 } as Record<string, number>)[t]!,
  agoda: ({ Queen: 470, Deluxe: 685, Suite: 1270, King: 895, Family: 1005, Executive: 1590 } as Record<string, number>)[t]!,
  expedia: ({ Queen: 475, Deluxe: 690, Suite: 1275, King: 900, Family: 1010, Executive: 1595 } as Record<string, number>)[t]!,
}));

const AVAILABILITY = Array.from({ length: 7 }, (_, i) => {
  const d = new Date("2026-05-25"); d.setDate(d.getDate() + i);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" }),
    Queen: 12 - (i % 4), Deluxe: 18 - (i % 5), Suite: 4 - (i % 2),
    King: 8 - (i % 3), Family: 6 - (i % 2), Executive: 3 - (i % 2),
  };
});

type SyncLog = { id: string; time: string; channel: string; action: string; detail: string; status: "success" | "warning" | "error" };
const SYNC_LOGS: SyncLog[] = [
  { id: "l1", time: "13:42", channel: "Booking.com", action: "Rates pushed", detail: "Deluxe AED 695 · 6 dates", status: "success" },
  { id: "l2", time: "13:35", channel: "Booking.com", action: "Reservation received", detail: "BDC-44218 · 3N · Hans Müller", status: "success" },
  { id: "l3", time: "13:30", channel: "Agoda", action: "Availability pulled", detail: "All room types · 30 days", status: "success" },
  { id: "l4", time: "13:18", channel: "Expedia", action: "Booking modified", detail: "EXP-99841 · dates pushed +1", status: "warning" },
  { id: "l5", time: "12:50", channel: "Goibibo", action: "Connection retry", detail: "Token refresh succeeded", status: "warning" },
  { id: "l6", time: "12:30", channel: "Airbnb", action: "Sync attempted", detail: "Channel disconnected — skipped", status: "error" },
];

export default function ChannelsPage() {
  const [tab, setTab] = React.useState<TabId>("connections");
  const [channels, setChannels] = React.useState<ChannelRow[]>([]);
  const [otaBookings, setOtaBookings] = React.useState<OtaBooking[]>([]);
  const [rateMap, setRateMap] = React.useState<RateMapRow[]>([]);
  const [syncLogs, setSyncLogs] = React.useState<SyncLog[]>([]);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  React.useEffect(() => {
    apiGet<ChannelRow[]>("/channels")
      .then(rows => setChannels(rows.map(c => ({ ...c, id: String(c.id) }))))
      .catch(() => {});
    apiGet<OtaBooking[]>("/ota-bookings")
      .then(rows => setOtaBookings(rows.map(r => ({ ...r, id: String(r.id) }))))
      .catch(() => {});
    apiGet<RateMapRow[]>("/channel-rate-maps")
      .then(rows => setRateMap(rows))
      .catch(() => {});
    apiGet<SyncLog[]>("/channel-sync-logs")
      .then(rows => setSyncLogs(rows.map(r => ({ ...r, id: String(r.id) }))))
      .catch(() => {});
  }, []);

  const patchChannel = (id: string, patch: Partial<ChannelRow>) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    apiPut(`/channels/${id}`, patch).catch(() => showToast("Could not save"));
  };
  const connectChannel = (c: ChannelRow) => { patchChannel(c.id, { status: "connected", lastSync: "Just now" }); showToast(`${c.name} connected`); };
  const syncChannel = (c: ChannelRow) => { patchChannel(c.id, { lastSync: "Just now" }); showToast(`${c.name} synced`); };
  const syncAll = () => { channels.forEach(c => { if (c.status !== "disconnected") patchChannel(c.id, { lastSync: "Just now" }); }); showToast("All channels synced"); };

  const totalBookings = channels.reduce((s, c) => s + c.bookings, 0);
  const totalRev = channels.reduce((s, c) => s + c.rev, 0);
  const connected = channels.filter(c => c.status === "connected").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">OTA / Channel Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">Two-way rate &amp; availability sync · double-booking prevention</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncAll}><RefreshCw className="h-4 w-4" />Sync All Now</Button>
          <Button onClick={() => { const d = channels.find(c => c.status === "disconnected"); if (d) connectChannel(d); else showToast("All channels are connected"); }}><Plus className="h-4 w-4" />Connect Channel</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Active Channels" value={connected} icon={Wifi} accent="success" hint={`${channels.length} configured`} />
        <KPICard label="OTA Bookings (MTD)" value={totalBookings} icon={Globe} accent="brand" />
        <KPICard label="OTA Revenue (MTD)" value={money(totalRev)} icon={Globe} accent="info" />
        <KPICard label="Avg Commission" value="15.8%" icon={Percent} accent="warning" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2",
                tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* CONNECTIONS */}
      {tab === "connections" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map(c => (
            <Card key={c.id} className={cn(
              "p-5 transition-all hover:shadow-md border-l-4",
              c.status === "connected" && "border-l-success",
              c.status === "syncing" && "border-l-info",
              c.status === "disconnected" && "border-l-border-strong"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-base">{c.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    {c.status === "connected" && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                    {c.status === "syncing" && <span className="h-1.5 w-1.5 rounded-full bg-info animate-pulse" />}
                    {c.status === "disconnected" && <WifiOff className="h-3 w-3" />}
                    Last sync · {c.lastSync}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "neutral"}>{c.status}</Badge>
              </div>
              <dl className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bookings</dt>
                  <dd className="text-base font-semibold mt-0.5 tabular">{c.bookings}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Commission</dt>
                  <dd className="text-base font-semibold mt-0.5 tabular">{c.commission}%</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue</dt>
                  <dd className="text-base font-semibold mt-0.5 tabular">{money(c.rev / 1000)}k</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                {c.status === "disconnected" ? (
                  <Button size="sm" className="flex-1" onClick={() => connectChannel(c)}><Link2 className="h-3.5 w-3.5" />Connect</Button>
                ) : (
                  <>
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => showToast(`${c.name} settings`)}>Settings</Button>
                    <Button variant="outline" size="sm" onClick={() => syncChannel(c)}><RefreshCw className="h-3.5 w-3.5" /></Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* OTA BOOKINGS */}
      {tab === "bookings" && (
        <>
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="Search by booking #, guest, channel…" className="flex-1 min-w-[240px] h-9" />
              <Select className="h-9 w-auto"><option>All channels</option>{channels.map(c => <option key={c.id}>{c.name}</option>)}</Select>
              <Select className="h-9 w-auto"><option>All statuses</option><option>Confirmed</option><option>Modified</option><option>Cancelled</option><option>Pending</option></Select>
              <Select className="h-9 w-auto"><option>This week</option><option>This month</option></Select>
            </div>
          </Card>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Booking #</th>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Check-in</th>
                  <th className="px-4 py-3 font-semibold text-right">Nights</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {otaBookings.map(o => (
                  <tr key={String(o.id)} className="hover:bg-surface-sunken/50 transition-colors">
                    <td className="px-4 py-3"><Badge tone="brand">{o.channel}</Badge></td>
                    <td className="px-4 py-3 tabular text-xs">{o.booking}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={o.guest} size={28} />
                        <span className="font-medium">{o.guest}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular">{o.room}</td>
                    <td className="px-4 py-3 text-muted-foreground">{o.checkIn}</td>
                    <td className="px-4 py-3 text-right tabular">{o.nights}</td>
                    <td className="px-4 py-3"><Badge tone={o.status === "confirmed" ? "success" : o.status === "modified" ? "warning" : "info"}>{o.status}</Badge></td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(Number(o.total))}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm">Open<ChevronRight className="h-3 w-3" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* RATE MAPPING */}
      {tab === "rates" && (
        <>
          <div className="text-xs text-muted-foreground">
            Push rates from PMS to channels · markup applied per channel · changes sync automatically.
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Room Type</th>
                  <th className="px-4 py-3 font-semibold text-right">PMS Base</th>
                  <th className="px-4 py-3 font-semibold text-right">Booking.com</th>
                  <th className="px-4 py-3 font-semibold text-right">Agoda</th>
                  <th className="px-4 py-3 font-semibold text-right">Expedia</th>
                  <th className="px-4 py-3 font-semibold text-right">Markup</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rateMap.map(r => (
                  <tr key={r.type}>
                    <td className="px-4 py-3 font-medium">{r.type}</td>
                    <td className="px-4 py-3 text-right tabular text-muted-foreground">{money(Number(r.pms))}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(Number(r.bdc))}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(Number(r.agoda))}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{money(Number(r.expedia))}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="brand">+{Math.round(((Number(r.bdc) - Number(r.pms)) / Number(r.pms)) * 100)}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm">Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* AVAILABILITY SYNC */}
      {tab === "availability" && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Inventory shared across channels · sold rooms deducted in real-time</span>
            <Button size="sm" variant="outline"><RefreshCw className="h-3.5 w-3.5" />Force resync</Button>
          </div>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  {ROOM_TYPES.map(t => <th key={t} className="px-4 py-3 font-semibold text-right">{t}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {AVAILABILITY.map((d, i) => (
                  <tr key={i} className="hover:bg-surface-sunken/40">
                    <td className="px-4 py-3 font-medium">{d.date}</td>
                    {ROOM_TYPES.map(t => {
                      const v = d[t as keyof typeof d] as number;
                      return (
                        <td key={t} className={cn("px-4 py-3 text-right tabular", v <= 2 ? "text-danger font-semibold" : v <= 5 ? "text-warning font-medium" : "text-success")}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* COMMISSIONS */}
      {tab === "commissions" && (
        <Card className="p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated"><CardTitle>Commission Summary (MTD)</CardTitle></CardHeader>
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/50 border-y border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Channel</th>
                <th className="px-5 py-2.5 font-semibold text-right">Bookings</th>
                <th className="px-5 py-2.5 font-semibold text-right">Revenue</th>
                <th className="px-5 py-2.5 font-semibold text-right">Rate</th>
                <th className="px-5 py-2.5 font-semibold text-right">Commission Owed</th>
                <th className="px-5 py-2.5 font-semibold text-right">Net to PMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channels.filter(c => c.bookings > 0).map(c => {
                const commission = Math.round(c.rev * c.commission / 100);
                return (
                  <tr key={c.id}>
                    <td className="px-5 py-3 font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-right tabular">{c.bookings}</td>
                    <td className="px-5 py-3 text-right tabular">{money(c.rev)}</td>
                    <td className="px-5 py-3 text-right tabular">{c.commission}%</td>
                    <td className="px-5 py-3 text-right tabular text-warning font-medium">{money(commission)}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold">{money(c.rev - commission)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-surface-elevated border-t border-border">
              <tr>
                <td className="px-5 py-3 font-semibold">Total</td>
                <td className="px-5 py-3 text-right tabular font-semibold">{channels.reduce((s, c) => s + c.bookings, 0)}</td>
                <td className="px-5 py-3 text-right tabular font-semibold">{money(channels.reduce((s, c) => s + c.rev, 0))}</td>
                <td></td>
                <td className="px-5 py-3 text-right tabular font-semibold text-warning">
                  {money(channels.reduce((s, c) => s + Math.round(c.rev * c.commission / 100), 0))}
                </td>
                <td className="px-5 py-3 text-right tabular font-semibold">
                  {money(channels.reduce((s, c) => s + (c.rev - Math.round(c.rev * c.commission / 100)), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {/* SYNC LOGS */}
      {tab === "logs" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Channel</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {syncLogs.map(l => (
                <tr key={String(l.id)} className="hover:bg-surface-sunken/40">
                  <td className="px-4 py-3 text-muted-foreground tabular">{l.time}</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{l.channel}</Badge></td>
                  <td className="px-4 py-3 font-medium">{l.action}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{l.detail}</td>
                  <td className="px-4 py-3">
                    {l.status === "success" && <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Success</Badge>}
                    {l.status === "warning" && <Badge tone="warning"><AlertCircle className="h-3 w-3" />Warning</Badge>}
                    {l.status === "error" && <Badge tone="danger"><AlertCircle className="h-3 w-3" />Error</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
