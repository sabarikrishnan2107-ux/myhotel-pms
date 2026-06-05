"use client";
import * as React from "react";
import { ExternalLink, Settings, MonitorSmartphone, Globe, TrendingUp, Eye, X, Save } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { money } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type WebRoom = { id: string; name: string; price: number; image?: string; desc?: string; published: boolean };
type EngineSettings = { domain: string; brandColor: string; paymentGateway: string; templates: string };
type BookingRow = { source?: string; total?: number; status?: string };

const DEFAULT_SETTINGS: EngineSettings = {
  domain: "book.pearlmarina.com",
  brandColor: "Champagne / Bronze",
  paymentGateway: "Stripe + Razorpay",
  templates: "Custom · 4 languages",
};

export default function WebsitePage() {
  const [rooms, setRooms] = React.useState<WebRoom[]>([]);
  const [settings, setSettings] = React.useState<EngineSettings>(DEFAULT_SETTINGS);
  const [bookings, setBookings] = React.useState<BookingRow[]>([]);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  React.useEffect(() => {
    apiGet<WebRoom[]>("/web-rooms")
      .then(rs => setRooms(rs.map(r => ({ ...r, id: String(r.id) }))))
      .catch(() => {});
    apiGet<Partial<EngineSettings>>("/settings/website")
      .then(s => { if (s && Object.keys(s).length) setSettings({ ...DEFAULT_SETTINGS, ...s }); })
      .catch(() => {});
    apiGet<BookingRow[]>("/bookings")
      .then(setBookings)
      .catch(() => {});
  }, []);

  const isDirect = (s?: string) => !!s && /website|direct/i.test(s);
  const directBookings = bookings.filter(b => isDirect(b.source) && b.status !== "cancelled");
  const directCount = directBookings.length;
  const webRevenue = directBookings.reduce((s, b) => s + (b.total ?? 0), 0);

  const togglePublished = (r: WebRoom) => {
    const next = !r.published;
    setRooms(prev => prev.map(x => x.id === r.id ? { ...x, published: next } : x));
    apiPut(`/web-rooms/${r.id}`, { published: next }).catch(() => showToast("Could not save"));
    showToast(`${r.name} ${next ? "published" : "hidden"}`);
  };

  const saveSettings = (next: EngineSettings) => {
    setSettings(next);
    apiPut("/settings/website", next).catch(() => showToast("Could not save settings"));
    setConfigOpen(false);
    showToast("Booking engine settings saved");
  };

  const published = rooms.filter(r => r.published);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Website Booking Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Direct bookings · zero commission · brand-themable per property</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfigOpen(true)}><Settings className="h-4 w-4" />Configure</Button>
          <Button onClick={() => window.open(`https://${settings.domain}`, "_blank")}><ExternalLink className="h-4 w-4" />View Live Site</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Direct Bookings" value={directCount} icon={Globe} accent="brand" hint="From real bookings" />
        <KPICard label="Web Revenue" value={money(webRevenue)} icon={TrendingUp} accent="success" hint="Zero commission" />
        <KPICard label="Conversion Rate" value="3.8%" icon={Eye} accent="info" delta={0.4} />
        <KPICard label="Live Visitors" value={12} icon={MonitorSmartphone} accent="accent" hint="Right now" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Live preview */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <CardHeader className="bg-surface-elevated border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Live Preview · Desktop</CardTitle>
              <Badge tone="success">Published</Badge>
            </div>
          </CardHeader>
          <div className="p-6 bg-linear-to-br from-brand-soft via-surface to-accent-soft">
            <div className="bg-surface rounded-lg shadow-lg p-6">
              {/* Mini header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-md bg-brand text-brand-foreground flex items-center justify-center text-xs font-bold">P</span>
                  <span className="font-display font-medium">The Pearl Marina</span>
                </div>
                <div className="flex gap-1.5">
                  {["Rooms", "Dining", "Spa", "Contact"].map(t => <span key={t} className="text-xs text-muted-foreground">{t}</span>)}
                </div>
              </div>
              {/* Search */}
              <div className="mt-5 grid grid-cols-4 gap-2 p-3 bg-surface-sunken rounded-md">
                <div><p className="text-[10px] uppercase text-muted-foreground font-semibold">Check-in</p><p className="text-sm font-medium mt-0.5">24 May 2026</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground font-semibold">Check-out</p><p className="text-sm font-medium mt-0.5">27 May 2026</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground font-semibold">Guests</p><p className="text-sm font-medium mt-0.5">2 Adults</p></div>
                <Button size="sm">Search Rooms</Button>
              </div>
              {/* Room cards — only published rooms appear on the live site */}
              <div className="mt-5 space-y-3">
                {published.map(r => (
                  <div key={r.id} className="flex items-center gap-4 p-4 rounded-md border border-border hover:bg-surface-sunken transition-colors">
                    <div className="h-16 w-20 rounded-md bg-brand-soft flex items-center justify-center text-3xl shrink-0">{r.image}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular text-brand">{money(r.price)}<span className="text-xs text-muted-foreground font-normal">/n</span></p>
                      <p className="text-[10px] text-muted-foreground">+ taxes</p>
                    </div>
                    <Button size="sm" variant="secondary">Book</Button>
                  </div>
                ))}
                {published.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No rooms published to the live site.</p>}
              </div>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Quick Settings</p>
            <button onClick={() => setConfigOpen(true)} className="text-xs text-brand hover:underline">Edit</button>
          </div>

          <Section title="Domain" value={settings.domain} tone="success" />
          <Section title="Brand Color" value={settings.brandColor} />
          <Section title="Payment Gateway" value={settings.paymentGateway} tone="success" />
          <Section title="Confirmation Templates" value={settings.templates} />

          <div className="pt-4 border-t border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Featured Rooms · click to toggle</p>
            <div className="space-y-1.5">
              {rooms.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className={r.published ? "" : "text-muted-foreground"}>{r.name}</span>
                  <button onClick={() => togglePublished(r)}>
                    <Badge tone={r.published ? "success" : "neutral"}>{r.published ? "Live" : "Hidden"}</Badge>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => setConfigOpen(true)}><Settings className="h-4 w-4" />Full Settings</Button>
        </Card>
      </div>

      {configOpen && <ConfigModal settings={settings} onClose={() => setConfigOpen(false)} onSave={saveSettings} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function ConfigModal({ settings, onClose, onSave }: { settings: EngineSettings; onClose: () => void; onSave: (s: EngineSettings) => void }) {
  const [s, setS] = React.useState<EngineSettings>(settings);
  const set = <K extends keyof EngineSettings>(k: K, v: EngineSettings[K]) => setS(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <CardTitle>Booking Engine Settings</CardTitle>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Domain</Label><Input value={s.domain} onChange={e => set("domain", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Brand Color</Label><Input value={s.brandColor} onChange={e => set("brandColor", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Payment Gateway</Label><Input value={s.paymentGateway} onChange={e => set("paymentGateway", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Confirmation Templates</Label><Input value={s.templates} onChange={e => set("templates", e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(s)} disabled={!s.domain}><Save className="h-3.5 w-3.5" />Save</Button>
        </div>
      </Card>
    </div>
  );
}

function Section({ title, value, tone }: { title: string; value: string; tone?: "success" }) {
  return (
    <div className="pb-3 border-b border-border last:border-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-sm font-medium">{value}</p>
        {tone === "success" && <Badge tone="success">Active</Badge>}
      </div>
    </div>
  );
}
