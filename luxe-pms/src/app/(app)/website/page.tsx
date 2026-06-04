"use client";
import { ExternalLink, Settings, MonitorSmartphone, Globe, TrendingUp, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { WEB_ROOMS } from "@/lib/mock-data-ext";
import { money } from "@/lib/utils";

export default function WebsitePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Website Booking Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">Direct bookings · zero commission · brand-themable per property</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Settings className="h-4 w-4" />Configure</Button>
          <Button><ExternalLink className="h-4 w-4" />View Live Site</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Direct Bookings MTD" value={142} icon={Globe} accent="brand" delta={12.4} />
        <KPICard label="Web Revenue" value={money(118400)} icon={TrendingUp} accent="success" delta={9.8} hint="Zero commission" />
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
              {/* Room cards */}
              <div className="mt-5 space-y-3">
                {WEB_ROOMS.map(r => (
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
              </div>
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Quick Settings</p>
          </div>

          <Section title="Domain" value="book.pearlmarina.com" tone="success" />
          <Section title="Brand Color" value="Champagne / Bronze" />
          <Section title="Payment Gateway" value="Stripe + Razorpay" tone="success" />
          <Section title="Confirmation Templates" value="Custom · 4 languages" />

          <div className="pt-4 border-t border-border">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Featured Rooms</p>
            <div className="space-y-1.5">
              {WEB_ROOMS.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.name}</span>
                  <Badge tone="success">Live</Badge>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full"><Settings className="h-4 w-4" />Full Settings</Button>
        </Card>
      </div>
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
