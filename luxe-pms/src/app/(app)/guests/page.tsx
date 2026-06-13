"use client";
import * as React from "react";
import {
  Users, Plus, Search, Crown, Phone, Mail, MessageSquare, Eye, MoreHorizontal,
  Ban, Star, Cake, Heart, MapPin, FileText, X, AlertCircle,
  CheckCircle2, CalendarPlus, IndianRupee, TrendingUp, BedDouble, Edit,
  Globe, Gift,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { KPICard } from "@/components/ui/kpi-card";
import { GUESTS, RESERVATIONS } from "@/lib/mock-data";
import type { Guest } from "@/lib/types";
import { money, formatDate, cn } from "@/lib/utils";
import { apiGet, apiPost, apiPut, sendEmail } from "@/lib/api";

// ========================= EXTENDED TYPE =========================
type GuestExt = Guest & {
  address?: string;
  birthday?: string;
  anniversary?: string;
  preferences?: string[];
  allergies?: string;
  internalNotes?: string;
  blacklistReason?: string;
  loyaltyPoints?: number;
};

// ========================= CONSTANTS =========================
const ID_TYPES = ["Aadhaar", "PAN", "Passport", "Driving License", "Voter ID"];
const NATIONALITY_OPTIONS = ["India", "USA", "UK", "UAE", "Singapore", "Germany", "France", "Japan", "Australia", "Canada", "Other"];
const PREFERENCES_OPTIONS = [
  "Quiet room", "High floor", "Sea view", "Near elevator",
  "Hypoallergenic pillow", "Extra towels", "Welcome drink",
  "Late breakfast", "Veg meal", "Twin bed",
];
const BLACKLIST_REASONS = [
  "Did not pay", "Property damage", "Hostile behaviour",
  "Fake ID document", "Smoking violation", "Other",
];

// ========================= HELPERS =========================
function loyaltyTier(g: GuestExt): { tier: "Silver" | "Gold" | "Platinum" | null; tone: "neutral" | "brand" | "accent" } {
  if (g.vip || g.lifetimeNights >= 15) return { tier: "Platinum", tone: "brand" };
  if (g.lifetimeNights >= 5) return { tier: "Gold", tone: "accent" };
  if (g.lifetimeNights >= 1) return { tier: "Silver", tone: "neutral" };
  return { tier: null, tone: "neutral" };
}

function daysSince(date?: string): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function lastStayStatus(g: GuestExt): { label: string; tone: "success" | "neutral" | "warning" } {
  const d = daysSince(g.lastStay);
  if (d === null) return { label: "Never stayed", tone: "neutral" };
  if (d <= 90) return { label: `${d}d ago`, tone: "success" };
  if (d <= 365) return { label: `${Math.max(1, Math.floor(d / 30))}mo ago`, tone: "neutral" };
  return { label: `${Math.floor(d / 365)}y ago · dormant`, tone: "warning" };
}

// ========================= MAIN COMPONENT =========================
export default function GuestsPage() {
  const [guests, setGuests] = React.useState<GuestExt[]>(() =>
    GUESTS.map((g, i) => ({
      ...g,
      ...(i === 0 ? { preferences: ["Quiet room", "Welcome drink"], allergies: "Peanuts", internalNotes: "Prefers late checkout — usually requests 1pm. Always books our heritage suite." } : {}),
      ...(i === 1 ? { preferences: ["High floor", "Sea view"], birthday: "1988-06-01" } : {}),
      ...(i === 2 ? { birthday: "1995-06-01", address: "Bandra West, Mumbai" } : {}),
      ...(i === 4 ? { anniversary: "2018-06-01", preferences: ["Twin bed", "Veg meal"] } : {}),
      ...(i === 6 ? { preferences: ["Hypoallergenic pillow"], allergies: "Lactose intolerant" } : {}),
      loyaltyPoints: g.lifetimeNights * 100 + Math.floor(g.lifetimeSpend / 100),
    }))
  );

  const [search, setSearch] = React.useState("");
  const [nationalityFilter, setNationalityFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "vip" | "repeat" | "dormant" | "blacklist">("all");
  const [sort, setSort] = React.useState<"lastStay-desc" | "spend-desc" | "nights-desc" | "name-asc">("lastStay-desc");

  const [editGuest, setEditGuest] = React.useState<GuestExt | "new" | null>(null);
  const [blacklistFor, setBlacklistFor] = React.useState<GuestExt | null>(null);
  const [detailGuest, setDetailGuest] = React.useState<GuestExt | null>(null);
  const [actionFor, setActionFor] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Load guests from Postgres on mount (falls back to seeds if the API is down).
  React.useEffect(() => {
    let cancelled = false;
    apiGet<GuestExt[]>("/guests")
      .then(rows => { if (!cancelled) setGuests(rows.map(r => ({ ...r, preferences: r.preferences ?? undefined }))); })
      .catch(() => { if (!cancelled) showToast("⚠ Backend offline — showing local data"); });
    return () => { cancelled = true; };
  }, []);

  const nationalities = Array.from(new Set(guests.map(g => g.nationality))).sort();

  const filtered = React.useMemo(() => {
    const list = guests.filter(g => {
      if (search && !`${g.name} ${g.phone} ${g.email} ${g.idNumber}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (nationalityFilter !== "all" && g.nationality !== nationalityFilter) return false;
      if (statusFilter === "vip" && !g.vip) return false;
      if (statusFilter === "repeat" && g.lifetimeNights < 2) return false;
      if (statusFilter === "dormant" && (daysSince(g.lastStay) ?? 0) < 365) return false;
      if (statusFilter === "blacklist" && !g.blacklist) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "lastStay-desc") return (b.lastStay || "").localeCompare(a.lastStay || "");
      if (sort === "spend-desc") return b.lifetimeSpend - a.lifetimeSpend;
      if (sort === "nights-desc") return b.lifetimeNights - a.lifetimeNights;
      return a.name.localeCompare(b.name);
    });
  }, [guests, search, nationalityFilter, statusFilter, sort]);

  const vipCount = guests.filter(g => g.vip).length;
  const repeatCount = guests.filter(g => g.lifetimeNights >= 2).length;
  const blacklistCount = guests.filter(g => g.blacklist).length;
  const dormantCount = guests.filter(g => (daysSince(g.lastStay) ?? 0) >= 365).length;
  const totalLifetimeSpend = guests.reduce((t, g) => t + g.lifetimeSpend, 0);

  // Birthday / anniversary today (using mock "today" = 2026-06-01 to match seed)
  const TODAY_MD = "06-01";
  const birthdayToday = guests.filter(g => g.birthday?.slice(5, 10) === TODAY_MD);
  const anniversariesToday = guests.filter(g => g.anniversary?.slice(5, 10) === TODAY_MD);

  const handleSave = async (data: GuestExt) => {
    const target = editGuest;
    setEditGuest(null);
    if (target === "new") {
      const payload = { ...data, lifetimeNights: 0, lifetimeSpend: 0 };
      try {
        const created = await apiPost<GuestExt>("/guests", payload);
        setGuests(prev => [created, ...prev]);
        showToast(`Guest ${data.name} added to registry`);
      } catch {
        showToast("⚠ Save failed — backend offline");
      }
    } else if (target && typeof target === "object") {
      const merged = { ...target, ...data, id: target.id };
      setGuests(prev => prev.map(g => g.id === target.id ? merged : g)); // optimistic
      try {
        await apiPut(`/guests/${target.id}`, merged);
        showToast(`Profile updated for ${data.name}`);
      } catch {
        showToast("⚠ Save failed — backend offline");
      }
    }
  };

  const handleBlacklist = async (g: GuestExt, reason: string, notes: string) => {
    const blacklistReason = `${reason}${notes ? ` · ${notes}` : ""}`;
    setGuests(prev => prev.map(x => x.id === g.id ? { ...x, blacklist: true, blacklistReason } : x));
    setBlacklistFor(null);
    showToast(`${g.name} blacklisted · ${reason}`);
    try { await apiPut(`/guests/${g.id}`, { blacklist: true, blacklistReason }); } catch { showToast("⚠ Save failed — backend offline"); }
  };

  const handleUnblacklist = async (g: GuestExt) => {
    setGuests(prev => prev.map(x => x.id === g.id ? { ...x, blacklist: false, blacklistReason: undefined } : x));
    showToast(`${g.name} restored — blacklist removed`);
    try { await apiPut(`/guests/${g.id}`, { blacklist: false, blacklistReason: null }); } catch { showToast("⚠ Save failed — backend offline"); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Guest Registry</h1>
          <p className="text-muted-foreground text-sm mt-1">{guests.length} profiles · CRM, loyalty &amp; stay history</p>
        </div>
        <Button onClick={() => setEditGuest("new")}><Plus className="h-4 w-4" />New guest</Button>
      </div>

      {/* Birthday / anniversary notice */}
      {(birthdayToday.length > 0 || anniversariesToday.length > 0) && (
        <Card className="p-3 bg-linear-to-r from-brand-soft/40 via-accent-soft/30 to-surface border-brand/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <Gift className="h-5 w-5 text-brand shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              {birthdayToday.length > 0 && (
                <p>
                  <Cake className="h-3 w-3 inline mr-1 text-brand" />
                  <strong>{birthdayToday.length} birthday{birthdayToday.length === 1 ? "" : "s"}</strong> today:
                  <span className="text-muted-foreground ml-1">{birthdayToday.map(g => g.name).join(", ")}</span>
                </p>
              )}
              {anniversariesToday.length > 0 && (
                <p className={birthdayToday.length > 0 ? "mt-1" : ""}>
                  <Heart className="h-3 w-3 inline mr-1 text-danger" />
                  <strong>{anniversariesToday.length} anniversary</strong> today:
                  <span className="text-muted-foreground ml-1">{anniversariesToday.map(g => g.name).join(", ")}</span>
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => showToast(`Greeting cards queued · ${birthdayToday.length + anniversariesToday.length} guests`)}>
              <Mail className="h-3.5 w-3.5" />Send wishes
            </Button>
          </div>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Total profiles" value={guests.length} icon={Users} accent="brand" />
        <KPICard label="VIP guests" value={vipCount} icon={Crown} accent="accent" hint="priority tier" />
        <KPICard label="Repeat guests" value={repeatCount} icon={TrendingUp} accent="success" hint="≥2 stays" />
        <KPICard label="Blacklisted" value={blacklistCount} icon={Ban} accent={blacklistCount > 0 ? "danger" : "neutral"} />
        <KPICard label="Lifetime revenue" value={money(totalLifetimeSpend)} icon={IndianRupee} accent="info" />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { id: "all", label: "All", count: guests.length, dot: null },
            { id: "vip", label: "VIP", count: vipCount, dot: "bg-brand" },
            { id: "repeat", label: "Repeat", count: repeatCount, dot: "bg-success" },
            { id: "dormant", label: "Dormant", count: dormantCount, dot: "bg-warning" },
            { id: "blacklist", label: "Blacklisted", count: blacklistCount, dot: "bg-danger" },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id as typeof statusFilter)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              statusFilter === f.id
                ? "bg-foreground text-background border-foreground shadow-xs"
                : "bg-surface text-muted-foreground border-border hover:bg-surface-sunken hover:text-foreground"
            )}>
              {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />}
              {f.label}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                statusFilter === f.id ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email, ID…" className="pl-9 h-9" />
          </div>
          <Select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)} className="h-9 w-auto">
            <option value="all">All nationalities</option>
            {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="h-9 w-auto" title="Sort order">
            <option value="lastStay-desc">Last stay (recent)</option>
            <option value="spend-desc">Highest spend</option>
            <option value="nights-desc">Most stays</option>
            <option value="name-asc">Name A–Z</option>
          </Select>
          {(search || nationalityFilter !== "all") && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setNationalityFilter("all"); }}>
              <X className="h-3 w-3" />Clear
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular">
            <span className="font-medium text-foreground">{filtered.length}</span> of {guests.length}
          </p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No guests match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting search or filters above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Nationality / ID</th>
                  <th className="px-4 py-3 font-semibold">Loyalty</th>
                  <th className="px-4 py-3 font-semibold text-right">Lifetime</th>
                  <th className="px-4 py-3 font-semibold">Last stay</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(g => {
                  const loy = loyaltyTier(g);
                  const ls = lastStayStatus(g);
                  return (
                    <tr key={g.id} className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer",
                      g.blacklist && "bg-danger-soft/15"
                    )} onClick={() => setDetailGuest(g)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={g.name} size={36} vip={g.vip} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium truncate">{g.name}</p>
                              {g.vip && <Crown className="h-3.5 w-3.5 text-brand shrink-0" />}
                              {g.blacklist && <Badge tone="danger"><Ban className="h-2.5 w-2.5" />Blacklisted</Badge>}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono tabular">{g.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <a href={`tel:${g.phone}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand tabular"><Phone className="h-3 w-3" />{g.phone}</a>
                        <br />
                        <a href={`mailto:${g.email}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand truncate max-w-[200px]"><Mail className="h-3 w-3" />{g.email}</a>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral"><Globe className="h-2.5 w-2.5" />{g.nationality}</Badge>
                        <p className="text-[11px] text-muted-foreground tabular mt-1">{g.idType || "ID"}: {g.idNumber && g.idNumber.length > 6 ? `${g.idNumber.slice(0, 4)}•••${g.idNumber.slice(-2)}` : (g.idNumber || "—")}</p>
                      </td>
                      <td className="px-4 py-3">
                        {loy.tier ? <Badge tone={loy.tone}><Star className="h-2.5 w-2.5" />{loy.tier}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                        {g.loyaltyPoints !== undefined && g.loyaltyPoints > 0 && (
                          <p className="text-[11px] text-muted-foreground tabular mt-1">{g.loyaltyPoints.toLocaleString()} pts</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold tabular">{money(g.lifetimeSpend)}</p>
                        <p className="text-[11px] text-muted-foreground tabular">{g.lifetimeNights} night{g.lifetimeNights === 1 ? "" : "s"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ls.tone}>{ls.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="inline-flex gap-1 items-center relative">
                          <button type="button" onClick={() => setDetailGuest(g)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="View profile">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => showToast(`Booking opened with ${g.name} pre-selected`)} className="h-8 w-8 rounded-md border border-border hover:bg-brand hover:text-brand-foreground hover:border-brand inline-flex items-center justify-center text-muted-foreground transition-colors" title="Quick book">
                            <CalendarPlus className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setActionFor(actionFor === g.id ? null : g.id)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="More">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {actionFor === g.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActionFor(null)} />
                              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-md shadow-xl z-40 py-1 text-sm">
                                <button onClick={() => { setEditGuest(g); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Edit className="h-3.5 w-3.5" />Edit profile</button>
                                <button onClick={() => {
                                  setActionFor(null);
                                  const to = g.email;
                                  if (!to) { showToast(`No email on file for ${g.name}`); return; }
                                  showToast(`Emailing ${g.name}…`);
                                  sendEmail({ to, subject: "Welcome to The Pearl Palace", heading: "Welcome", greeting: g.name, intro: "We're delighted to welcome you and look forward to making your stay memorable.", context: "Welcome email" })
                                    .then(() => showToast(`Welcome email sent to ${g.name}`))
                                    .catch(() => showToast(`Couldn't email ${g.name}`));
                                }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" />Send welcome</button>
                                <button onClick={() => { showToast(`Searching merge candidates for ${g.name}…`); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Users className="h-3.5 w-3.5" />Find duplicates</button>
                                <hr className="my-1 border-border" />
                                {g.blacklist ? (
                                  <button onClick={() => { handleUnblacklist(g); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2 text-success"><CheckCircle2 className="h-3.5 w-3.5" />Remove blacklist</button>
                                ) : (
                                  <button onClick={() => { setBlacklistFor(g); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2 text-danger"><Ban className="h-3.5 w-3.5" />Blacklist guest</button>
                                )}
                              </div>
                            </>
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

      {/* Modals + drawer */}
      {editGuest && (
        <AddEditGuestModal
          guest={editGuest === "new" ? null : editGuest}
          onClose={() => setEditGuest(null)}
          onSave={handleSave}
        />
      )}
      {blacklistFor && (
        <BlacklistModal
          guest={blacklistFor}
          onClose={() => setBlacklistFor(null)}
          onSave={handleBlacklist}
        />
      )}
      {detailGuest && (
        <GuestDetailDrawer
          guest={detailGuest}
          onClose={() => setDetailGuest(null)}
          onEdit={() => { setEditGuest(detailGuest); setDetailGuest(null); }}
          onToast={showToast}
        />
      )}

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

// ========================= ADD / EDIT GUEST MODAL =========================
function AddEditGuestModal({ guest, onClose, onSave }: {
  guest: GuestExt | null;
  onClose: () => void;
  onSave: (g: GuestExt) => void;
}) {
  const [form, setForm] = React.useState<GuestExt>(guest || {
    id: "", name: "", phone: "+91 ", email: "", nationality: "India",
    idType: "Aadhaar", idNumber: "", vip: false, blacklist: false,
    lifetimeNights: 0, lifetimeSpend: 0,
    preferences: [], loyaltyPoints: 0,
  });

  const update = <K extends keyof GuestExt>(k: K, v: GuestExt[K]) => setForm(f => ({ ...f, [k]: v }));
  const togglePref = (p: string) => update("preferences", form.preferences?.includes(p)
    ? form.preferences.filter(x => x !== p)
    : [...(form.preferences || []), p]);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const canSave = form.name.trim().length > 1 && form.phone.trim().length > 4;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Users className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">{guest ? "Edit guest profile" : "New guest profile"}</h3>
              <p className="text-xs text-muted-foreground">{guest ? `Updating ${guest.name}` : "Add to permanent registry"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name *</Label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Mr. Karan Mehta" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone *</Label>
              <Input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91 9XXXX XXXXX" className="h-9 tabular" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="guest@example.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nationality</Label>
              <Select value={form.nationality} onChange={e => update("nationality", e.target.value)} className="h-9">
                {NATIONALITY_OPTIONS.map(n => <option key={n}>{n}</option>)}
              </Select>
            </div>
          </div>

          {/* ID */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Government ID</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Document type</Label>
                <Select value={form.idType} onChange={e => update("idType", e.target.value)} className="h-9">
                  {ID_TYPES.map(t => <option key={t}>{t}</option>)}
                  <option>Other</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Document number</Label>
                <Input value={form.idNumber} onChange={e => update("idNumber", e.target.value)} placeholder="ID number" className="h-9 tabular" />
              </div>
            </div>
          </div>

          {/* Personal */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Personal details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs"><Cake className="h-3 w-3 inline mr-1" />Birthday</Label>
                <Input type="date" value={form.birthday || ""} onChange={e => update("birthday", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs"><Heart className="h-3 w-3 inline mr-1" />Anniversary</Label>
                <Input type="date" value={form.anniversary || ""} onChange={e => update("anniversary", e.target.value)} className="h-9 tabular" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs"><MapPin className="h-3 w-3 inline mr-1" />City / Address</Label>
                <Input value={form.address || ""} onChange={e => update("address", e.target.value)} placeholder="City, State" className="h-9" />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Service preferences</p>
            <div className="flex flex-wrap gap-1.5">
              {PREFERENCES_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => togglePref(p)} className={cn(
                  "h-7 px-2.5 rounded-full text-xs border transition-colors",
                  form.preferences?.includes(p) ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{p}</button>
              ))}
            </div>
          </div>

          {/* Allergies + internal notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs"><AlertCircle className="h-3 w-3 inline mr-1" />Allergies / dietary</Label>
              <Input value={form.allergies || ""} onChange={e => update("allergies", e.target.value)} placeholder="Peanuts, lactose, …" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs"><FileText className="h-3 w-3 inline mr-1" />Internal note</Label>
              <Input value={form.internalNotes || ""} onChange={e => update("internalNotes", e.target.value)} placeholder="Staff-only context" className="h-9" />
            </div>
          </div>

          {/* VIP toggle */}
          <div className="rounded-md border border-border p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium inline-flex items-center gap-2"><Crown className="h-4 w-4 text-brand" />VIP status</p>
              <p className="text-xs text-muted-foreground mt-0.5">Priority service · room upgrades · complimentary amenities</p>
            </div>
            <button type="button" onClick={() => update("vip", !form.vip)} className={cn(
              "relative h-6 w-11 rounded-full transition-colors shrink-0",
              form.vip ? "bg-brand" : "bg-surface-sunken"
            )} aria-label="Toggle VIP">
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform",
                form.vip ? "translate-x-[22px]" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!canSave}>
            <CheckCircle2 className="h-3.5 w-3.5" />{guest ? "Save changes" : "Add guest"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========================= BLACKLIST MODAL =========================
function BlacklistModal({ guest, onClose, onSave }: {
  guest: GuestExt;
  onClose: () => void;
  onSave: (g: GuestExt, reason: string, notes: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const canConfirm = reason !== "" && confirm === "BLACKLIST";

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-danger-soft text-danger inline-flex items-center justify-center"><Ban className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Blacklist guest</h3>
              <p className="text-xs text-muted-foreground">Block future bookings for {guest.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Card className="p-3 bg-danger-soft/15 border-danger/30 text-xs">
            <strong>{guest.name}</strong> has stayed {guest.lifetimeNights} night{guest.lifetimeNights === 1 ? "" : "s"} with lifetime spend of {money(guest.lifetimeSpend)}. Future booking attempts will be flagged at front desk.
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason *</Label>
            <div className="flex flex-wrap gap-1.5">
              {BLACKLIST_REASONS.map(r => (
                <button key={r} type="button" onClick={() => setReason(r)} className={cn(
                  "h-7 px-2.5 rounded-full text-xs border transition-colors",
                  reason === r ? "bg-danger text-white border-danger" : "border-border hover:bg-surface-sunken"
                )}>{r}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Additional notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Document evidence, witnesses, dates…" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden resize-y" />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs">Type <strong>BLACKLIST</strong> to confirm</Label>
            <Input value={confirm} onChange={e => setConfirm(e.target.value)} className="h-9 font-mono tabular text-sm" placeholder="BLACKLIST" />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onSave(guest, reason, notes)} disabled={!canConfirm}>
            <Ban className="h-3.5 w-3.5" />Confirm blacklist
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========================= GUEST DETAIL DRAWER =========================
function GuestDetailDrawer({ guest, onClose, onEdit, onToast }: {
  guest: GuestExt;
  onClose: () => void;
  onEdit: () => void;
  onToast: (m: string) => void;
}) {
  const [tab, setTab] = React.useState<"profile" | "stays" | "loyalty" | "notes">("profile");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const pastStays = RESERVATIONS.filter(r => r.guestName === guest.name);
  const loy = loyaltyTier(guest);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-linear-to-r from-brand-soft/30 to-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={guest.name} size={48} vip={guest.vip} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg truncate">{guest.name}</h3>
                  {guest.vip && <Crown className="h-4 w-4 text-brand shrink-0" />}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {loy.tier && <Badge tone={loy.tone}><Star className="h-2.5 w-2.5" />{loy.tier}</Badge>}
                  <Badge tone="neutral"><Globe className="h-2.5 w-2.5" />{guest.nationality}</Badge>
                  {guest.blacklist && <Badge tone="danger"><Ban className="h-2.5 w-2.5" />Blacklisted</Badge>}
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center shrink-0"><X className="h-4 w-4" /></button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-3">
            <a href={`tel:${guest.phone}`} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Phone className="h-3.5 w-3.5" />Call</a>
            <a href={`mailto:${guest.email}`} className="flex-1 h-9 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Mail className="h-3.5 w-3.5" />Email</a>
            <button type="button" onClick={() => onToast(`WhatsApp opened for ${guest.name}`)} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><MessageSquare className="h-3.5 w-3.5" />WhatsApp</button>
            <button type="button" onClick={() => onToast(`Booking flow opened with ${guest.name}`)} className="flex-1 h-9 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><CalendarPlus className="h-3.5 w-3.5" />Book</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-sunken/40 px-2">
          {([
            { id: "profile", label: "Profile" },
            { id: "stays", label: `Stays (${pastStays.length})` },
            { id: "loyalty", label: "Loyalty" },
            { id: "notes", label: "Notes" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn(
              "px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
              tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {tab === "profile" && (
            <div className="space-y-4">
              {/* Lifetime mini-stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 text-center">
                  <BedDouble className="h-4 w-4 mx-auto text-brand mb-1" />
                  <p className="text-lg font-bold tabular">{guest.lifetimeNights}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Nights</p>
                </Card>
                <Card className="p-3 text-center">
                  <IndianRupee className="h-4 w-4 mx-auto text-success mb-1" />
                  <p className="text-lg font-bold tabular">{money(guest.lifetimeSpend)}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Lifetime</p>
                </Card>
                <Card className="p-3 text-center">
                  <Star className="h-4 w-4 mx-auto text-accent mb-1" />
                  <p className="text-lg font-bold tabular">{guest.loyaltyPoints?.toLocaleString() || 0}</p>
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Points</p>
                </Card>
              </div>

              {/* Contact + ID */}
              <Card className="p-4 space-y-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Contact</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="tabular">{guest.phone}</span></div>
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{guest.email}</span></div>
                  {guest.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span>{guest.address}</span></div>}
                </div>
                <hr className="border-border" />
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Government ID</p>
                <p className="text-sm"><strong>{guest.idType}</strong>: <span className="tabular">{guest.idNumber}</span></p>
                {(guest.birthday || guest.anniversary) && (
                  <>
                    <hr className="border-border" />
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Important dates</p>
                    <div className="space-y-1 text-sm">
                      {guest.birthday && <div className="flex items-center gap-2"><Cake className="h-3.5 w-3.5 text-brand" /><span className="tabular">{formatDate(guest.birthday)}</span></div>}
                      {guest.anniversary && <div className="flex items-center gap-2"><Heart className="h-3.5 w-3.5 text-danger" /><span className="tabular">{formatDate(guest.anniversary)}</span></div>}
                    </div>
                  </>
                )}
              </Card>

              {/* Preferences */}
              {((guest.preferences && guest.preferences.length > 0) || guest.allergies) && (
                <Card className="p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Service preferences</p>
                  {guest.preferences && guest.preferences.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {guest.preferences.map(p => <Badge key={p} tone="info">{p}</Badge>)}
                    </div>
                  )}
                  {guest.allergies && (
                    <div className="text-sm bg-danger-soft/15 border border-danger/30 rounded-md p-2 flex items-start gap-2 text-danger">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <p><strong>Allergies:</strong> {guest.allergies}</p>
                    </div>
                  )}
                </Card>
              )}

              <Button variant="outline" onClick={onEdit} className="w-full"><Edit className="h-3.5 w-3.5" />Edit profile</Button>
            </div>
          )}

          {tab === "stays" && (
            <div className="space-y-3">
              {pastStays.length === 0 ? (
                <div className="text-center py-8">
                  <BedDouble className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No past stays recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">First-time guest or history not yet linked</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{pastStays.length} booking{pastStays.length === 1 ? "" : "s"} found in this property</p>
                  {pastStays.map(r => (
                    <Card key={r.id} className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{r.bookingNo} · Room {r.roomNumber}</p>
                          <p className="text-xs text-muted-foreground tabular mt-0.5">
                            {formatDate(r.checkIn)} → {formatDate(r.checkOut)} · {r.nights}N · {r.source}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold tabular text-sm">{money(r.total)}</p>
                          <Badge tone={r.paymentStatus === "paid" ? "success" : r.paymentStatus === "partial" ? "warning" : "danger"}>{r.paymentStatus}</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "loyalty" && (
            <div className="space-y-3">
              <Card className={cn(
                "p-5 text-center border-2",
                loy.tone === "brand" ? "bg-brand-soft/30 border-brand/40" :
                loy.tone === "accent" ? "bg-accent-soft/30 border-accent/40" :
                "bg-surface-sunken/30 border-border"
              )}>
                <Star className="h-10 w-10 mx-auto mb-2 text-brand" />
                <p className="text-3xl font-display font-bold">{loy.tier || "Bronze"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">earned over {guest.lifetimeNights} stays</p>
                <p className="text-4xl font-bold tabular mt-4">{guest.loyaltyPoints?.toLocaleString() || 0}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Points balance</p>
              </Card>

              <Card className="p-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Tier benefits</p>
                <ul className="space-y-1.5 text-xs">
                  {(loy.tier === "Platinum" ? [
                    "Complimentary room upgrade (subject to availability)",
                    "Free breakfast for 2 guests",
                    "Late checkout till 4 PM",
                    "Welcome amenity in room",
                    "20% off F&B and spa",
                    "Dedicated concierge line",
                  ] : loy.tier === "Gold" ? [
                    "Free breakfast for 1 guest",
                    "Late checkout till 1 PM",
                    "Welcome drink",
                    "10% off F&B",
                    "Premium Wi-Fi",
                  ] : loy.tier === "Silver" ? [
                    "Welcome drink",
                    "5% off F&B",
                    "Premium Wi-Fi",
                  ] : [
                    "Member rates on direct booking",
                    "Welcome to the loyalty program",
                  ]).map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />{b}
                    </li>
                  ))}
                </ul>
              </Card>

              <Button variant="outline" className="w-full" onClick={() => onToast(`Points redemption opened for ${guest.name}`)}>
                <Star className="h-3.5 w-3.5" />Redeem points
              </Button>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-3">
              {guest.internalNotes && (
                <Card className="p-3 bg-info-soft/15 border-info/20">
                  <p className="text-[10px] uppercase tracking-wider text-info font-semibold mb-1">Internal staff note</p>
                  <p className="text-sm italic">&ldquo;{guest.internalNotes}&rdquo;</p>
                </Card>
              )}
              {guest.blacklist && guest.blacklistReason && (
                <Card className="p-3 bg-danger-soft/15 border-danger/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-danger flex items-center gap-1.5"><Ban className="h-3 w-3" />Blacklist record</p>
                  <p className="text-sm mt-1">{guest.blacklistReason}</p>
                </Card>
              )}
              {!guest.internalNotes && !guest.blacklist && (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No notes yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add an internal note via Edit profile</p>
                  <Button variant="outline" size="sm" onClick={onEdit} className="mt-3"><Edit className="h-3 w-3" />Add note</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
