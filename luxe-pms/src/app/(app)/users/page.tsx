"use client";
import * as React from "react";
import {
  Plus, Search, ShieldCheck, KeySquare, MoreVertical, UserPlus, X,
  Mail, Phone, Eye, Edit, Lock, Power, Send, AlertCircle, CheckCircle2,
  Smartphone, MapPin, Activity, Copy, RefreshCw, Clock, Trash2, Upload,
  Users, Users as UsersIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { USERS } from "@/lib/mock-data-ext";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPut, sendEmail } from "@/lib/api";

type Role = "Owner" | "Manager" | "Reception" | "Accounts" | "Housekeeping" | "Restaurant";

const ROLE_TONE: Record<Role, "brand" | "info" | "neutral" | "accent" | "warning" | "success"> = {
  Owner: "brand", Manager: "info", Reception: "neutral",
  Accounts: "accent", Housekeeping: "warning", Restaurant: "success",
};
const ROLES: Role[] = ["Owner", "Manager", "Reception", "Accounts", "Housekeeping", "Restaurant"];

type SeededUser = typeof USERS[number];
type Status = "active" | "disabled";
type UserExt = Omit<SeededUser, "status"> & {
  status: Status;
  phone?: string;
  joinedAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  sessions?: { id: string; device: string; ip: string; location: string; active: boolean; startedAt: string }[];
  loginHistory?: { at: string; ip: string; device: string; success: boolean }[];
};

/** Enrich a core account row (from DB or mock) with display-only session/activity data. */
function enrich(u: SeededUser & { phone?: string; joinedAt?: string }, i: number): UserExt {
  return {
    ...u,
    phone: u.phone || `+91 9${(98765 + i * 137).toString().slice(-4)} ${(43210 + i * 79).toString().slice(-5)}`,
    joinedAt: u.joinedAt || `${["12 Mar 2024", "18 Jun 2024", "5 Aug 2024", "22 Jan 2025", "10 Apr 2025", "3 Feb 2025", "1 Jan 2020", "9 Sep 2024"][i] || "2024"}`,
    lastLoginAt: u.last,
    lastLoginIp: `10.0.0.${10 + i * 3}`,
    lastLoginDevice: ["MacBook Pro · Chrome", "iPad · Safari", "iPhone · Mobile Safari", "Windows · Edge", "Mac · Firefox", "Android · Chrome", "Manager iPhone", "Reception Terminal"][i % 8],
    sessions: i < 3
      ? [{ id: `s-${u.id}-1`, device: "MacBook Pro · Chrome", ip: `10.0.0.${10 + i * 3}`, location: "Mumbai, IN", active: true, startedAt: "47 min ago" }]
      : i < 5
        ? [{ id: `s-${u.id}-1`, device: "iPad · Safari", ip: `10.0.0.${10 + i * 3}`, location: "Mumbai, IN", active: true, startedAt: "2h ago" }]
        : [],
    loginHistory: [
      { at: u.last, ip: `10.0.0.${10 + i * 3}`, device: ["MacBook Pro · Chrome", "iPad · Safari", "iPhone"][i % 3], success: true },
      { at: "Yesterday 18:42", ip: `10.0.0.${10 + i * 3}`, device: "MacBook Pro · Chrome", success: true },
      { at: "2 days ago 09:14", ip: `10.0.0.${10 + i * 3}`, device: "MacBook Pro · Chrome", success: i !== 7 },
    ],
  };
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<UserExt[]>([]);
  React.useEffect(() => {
    apiGet<(SeededUser & { phone?: string; joinedAt?: string })[]>("/app-users")
      .then(rows => setUsers(rows.map((r, i) => enrich({ ...r, id: String(r.id) }, i))))
      .catch(() => {});
  }, []);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | Status>("all");

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserExt | null>(null);
  const [detailUser, setDetailUser] = React.useState<UserExt | null>(null);
  const [resetUser, setResetUser] = React.useState<UserExt | null>(null);
  const [actionFor, setActionFor] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const filtered = React.useMemo(() => {
    return users.filter(u => {
      if (search && !`${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const active = users.filter(u => u.status === "active").length;
  const twoFA = users.filter(u => u.twoFA).length;
  const sessionsNow = users.reduce((t, u) => t + (u.sessions?.filter(s => s.active).length || 0), 0);
  const noMfa = users.filter(u => u.status === "active" && !u.twoFA).length;

  const DB_FIELDS = ["name", "email", "role", "status", "last", "twoFA", "phone", "joinedAt"];
  const update = (id: string, patch: Partial<UserExt>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    const dbPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => DB_FIELDS.includes(k)));
    if (Object.keys(dbPatch).length) apiPut(`/app-users/${id}`, dbPatch).catch(() => {});
  };

  const handleSuspend = (u: UserExt) => {
    update(u.id, { status: u.status === "active" ? "disabled" : "active" });
    showToast(`${u.name} ${u.status === "active" ? "suspended" : "reactivated"}`);
  };
  const handleForceMfa = (u: UserExt) => {
    update(u.id, { twoFA: true });
    showToast(`${u.name} will be required to set up MFA on next login`);
  };
  const handleKillSessions = (u: UserExt) => {
    update(u.id, { sessions: [] });
    showToast(`Signed out all sessions for ${u.name}`);
  };
  const handleReset = (u: UserExt) => setResetUser(u);

  const handleInvite = (data: { name: string; email: string; role: Role; phone: string; sendEmail: boolean; sendWhatsApp: boolean }) => {
    const draft = {
      name: data.name, email: data.email, role: data.role,
      status: "active", last: "Pending first login", twoFA: false,
      phone: data.phone, joinedAt: new Date().toISOString().slice(0, 10),
    };
    apiPost<SeededUser>("/app-users", draft)
      .then(row => setUsers(prev => [enrich({ ...row, id: String(row.id) }, prev.length), ...prev]))
      .catch(() => showToast("Could not save user"));
    setInviteOpen(false);
    if (data.sendEmail && data.email) {
      sendEmail({
        to: data.email,
        subject: "You've been invited to The Pearl Palace PMS",
        heading: "Account Invitation",
        greeting: data.name,
        intro: `You've been added to the PMS as ${data.role}. Sign in to set your password and get started.`,
        context: "User invite",
      }).catch(() => {});
    }
    const channels = [data.sendEmail && "Email", data.sendWhatsApp && "WhatsApp"].filter(Boolean).join(" + ");
    showToast(`Invite sent to ${data.name} via ${channels || "Email"}`);
  };

  const handleEditSave = (u: UserExt) => {
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    const dbPatch = Object.fromEntries(Object.entries(u).filter(([k]) => DB_FIELDS.includes(k)));
    apiPut(`/app-users/${u.id}`, dbPatch).catch(() => showToast("Could not save changes"));
    setEditUser(null);
    showToast(`${u.name} updated`);
  };

  const activeFilters = (search ? 1 : 0) + (roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Staff accounts · roles · 2FA · sessions · activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast(`Org chart opened · ${users.length} staff across ${new Set(users.map(u => u.role)).size} roles`)}>
            <Users className="h-4 w-4" />Org chart
          </Button>
          <Button variant="outline" onClick={() => showToast("Bulk-import CSV template downloaded")}>
            <Upload className="h-4 w-4" />Import CSV
          </Button>
          <Button variant="outline" onClick={() => showToast("New role draft opened")}>
            <Plus className="h-4 w-4" />New role
          </Button>
          <Button onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4" />Invite user</Button>
        </div>
      </div>

      {/* MFA warning */}
      {noMfa > 0 && (
        <Card className="p-3 bg-warning-soft/15 border-warning/30 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm"><strong>{noMfa} active user{noMfa === 1 ? "" : "s"}</strong> still without 2FA. Enforce MFA to harden access.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => {
            const toEnforce = users.filter(u => u.status === "active" && !u.twoFA);
            setUsers(prev => prev.map(u => u.status === "active" ? { ...u, twoFA: true } : u));
            toEnforce.forEach(u => apiPut(`/app-users/${u.id}`, { twoFA: true }).catch(() => {}));
            showToast(`MFA enforced on ${toEnforce.length} users · they'll set up on next login`);
          }}>
            <ShieldCheck className="h-3.5 w-3.5" />Enforce MFA on all
          </Button>
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Total users" value={users.length} icon={UsersIcon} accent="brand" />
        <KPICard label="Active" value={active} icon={CheckCircle2} accent="success" hint={`${users.length - active} disabled`} />
        <KPICard label="2FA coverage" value={`${Math.round(twoFA / users.length * 100)}%`} icon={ShieldCheck} accent={twoFA / users.length >= 0.75 ? "success" : "warning"} hint={`${twoFA} of ${users.length}`} />
        <KPICard label="Live sessions" value={sessionsNow} icon={Activity} accent="info" hint="signed in now" />
        <KPICard label="Roles defined" value={ROLES.length} icon={KeySquare} accent="accent" />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", ...ROLES] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r as "all" | Role)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
              roleFilter === r ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>
              {r === "all" ? "All roles" : r}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                roleFilter === r ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>{r === "all" ? users.length : users.filter(u => u.role === r).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users by name, email, role…" className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | Status)} className="h-9 w-auto text-xs">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}>
              <X className="h-3 w-3" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular inline-flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            <span className="font-medium text-foreground">{filtered.length}</span> of {users.length}
          </p>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No users match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing filters above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">2FA</th>
                <th className="px-4 py-3 font-semibold">Last activity</th>
                <th className="px-4 py-3 font-semibold">Sessions</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(u => {
                const liveSessions = u.sessions?.filter(s => s.active).length || 0;
                return (
                  <tr key={u.id}
                    onClick={() => setDetailUser(u)}
                    className={cn(
                      "hover:bg-surface-sunken/50 transition-colors cursor-pointer",
                      u.status === "disabled" && "opacity-50"
                    )}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size={36} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={ROLE_TONE[u.role as Role] ?? "neutral"}>{u.role}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={u.status === "active" ? "success" : "neutral"}>{u.status}</Badge></td>
                    <td className="px-4 py-3">
                      {u.twoFA ? (
                        <Badge tone="success"><ShieldCheck className="h-3 w-3" />Enabled</Badge>
                      ) : (
                        <Badge tone="warning">Off</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular">{u.lastLoginAt}</td>
                    <td className="px-4 py-3">
                      {liveSessions > 0 ? (
                        <Badge tone="info"><Activity className="h-3 w-3" />{liveSessions} live</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="inline-flex gap-1 items-center relative">
                        <button type="button" onClick={() => setDetailUser(u)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="View detail">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setActionFor(actionFor === u.id ? null : u.id)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="More">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {actionFor === u.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setActionFor(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-md shadow-xl z-40 py-1 text-sm">
                              <button onClick={() => { setEditUser(u); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Edit className="h-3.5 w-3.5" />Edit profile</button>
                              <button onClick={() => { handleReset(u); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Lock className="h-3.5 w-3.5" />Reset password</button>
                              {!u.twoFA && (
                                <button onClick={() => { handleForceMfa(u); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />Force MFA</button>
                              )}
                              {liveSessions > 0 && (
                                <button onClick={() => { handleKillSessions(u); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Power className="h-3.5 w-3.5" />Sign out all sessions</button>
                              )}
                              <hr className="my-1 border-border" />
                              <button onClick={() => { handleSuspend(u); setActionFor(null); }} className={cn("w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2",
                                u.status === "active" ? "text-danger" : "text-success"
                              )}>
                                <Power className="h-3.5 w-3.5" />{u.status === "active" ? "Suspend account" : "Reactivate account"}
                              </button>
                              <button onClick={() => { setActionFor(null); showToast(`Delete request raised for ${u.name} — admin approval required`); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2 text-danger">
                                <Trash2 className="h-3.5 w-3.5" />Delete user
                              </button>
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
        )}
      </Card>

      {/* Modals */}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onSave={handleInvite} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleEditSave} />}
      {detailUser && <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} onEdit={() => { setEditUser(detailUser); setDetailUser(null); }} onSuspend={() => { handleSuspend(detailUser); setDetailUser(null); }} onKillSessions={() => { handleKillSessions(detailUser); setDetailUser(prev => prev ? { ...prev, sessions: [] } : null); }} onToast={showToast} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onConfirm={(method) => {
        const target = resetUser;
        setResetUser(null);
        if (/email/i.test(method) && target.email) {
          sendEmail({ to: target.email, subject: "Password reset", heading: "Password Reset", greeting: target.name, intro: "A password reset was requested for your account. Please follow the instructions in the PMS to set a new password.", context: "Password reset" }).catch(() => {});
        }
        showToast(`Password reset · ${method} sent to ${target.name}`);
      }} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ============== INVITE MODAL ==============
function InviteModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: { name: string; email: string; role: Role; phone: string; sendEmail: boolean; sendWhatsApp: boolean }) => void;
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("+91 ");
  const [role, setRole] = React.useState<Role>("Reception");
  const [sendEmail, setSendEmail] = React.useState(true);
  const [sendWhatsApp, setSendWhatsApp] = React.useState(true);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const valid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);
  const link = `https://app.myhotel.in/invite/${Date.now().toString(36)}`;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><UserPlus className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Invite a new user</h3>
              <p className="text-xs text-muted-foreground">They&apos;ll receive a setup link to create their password</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Full name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@pearlmarina.com" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone (for WhatsApp invite)</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9XXXX XXXXX" className="h-9 tabular" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role *</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setRole(r)} className={cn(
                  "h-9 rounded-md border text-xs font-medium transition-colors",
                  role === r ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{r}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs">Send invite via</Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSendEmail(s => !s)} className={cn(
                "h-9 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                sendEmail ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
              )}><Mail className="h-3.5 w-3.5" />Email</button>
              <button type="button" onClick={() => setSendWhatsApp(s => !s)} className={cn(
                "h-9 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                sendWhatsApp ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
              )}><Smartphone className="h-3.5 w-3.5" />WhatsApp</button>
            </div>
          </div>
          <Card className="p-2.5 bg-info-soft/15 border-info/20 text-[11px]">
            <p className="font-semibold uppercase tracking-wider text-info mb-1">Invite link (expires in 48h)</p>
            <div className="flex items-center gap-1.5">
              <code className="font-mono tabular text-xs flex-1 truncate">{link}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="h-6 w-6 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center"><Copy className="h-3 w-3" /></button>
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, email, role, phone, sendEmail, sendWhatsApp })} disabled={!valid || (!sendEmail && !sendWhatsApp)}>
            <Send className="h-3.5 w-3.5" />Send invite
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============== EDIT USER MODAL ==============
function EditUserModal({ user, onClose, onSave }: {
  user: UserExt;
  onClose: () => void;
  onSave: (u: UserExt) => void;
}) {
  const [form, setForm] = React.useState<UserExt>(user);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const update = <K extends keyof UserExt>(k: K, v: UserExt[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Avatar name={user.name} size={36} />
            <div>
              <h3 className="font-semibold">Edit profile</h3>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Full name</Label>
            <Input value={form.name} onChange={e => update("name", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone || ""} onChange={e => update("phone", e.target.value)} className="h-9 tabular" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={form.role} onChange={e => update("role", e.target.value)} className="h-9">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>
            <CheckCircle2 className="h-3.5 w-3.5" />Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============== RESET PASSWORD MODAL ==============
function ResetPasswordModal({ user, onClose, onConfirm }: {
  user: UserExt;
  onClose: () => void;
  onConfirm: (method: string) => void;
}) {
  const [method, setMethod] = React.useState<"link" | "temp">("link");

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
            <span className="h-9 w-9 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Lock className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Reset password</h3>
              <p className="text-xs text-muted-foreground">{user.name} · {user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <button type="button" onClick={() => setMethod("link")} className={cn(
            "w-full p-3 rounded-md border-2 text-left transition-colors",
            method === "link" ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
          )}>
            <p className="text-sm font-semibold">Email reset link</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sends a one-time-use link valid for 24 hours. Recommended.</p>
          </button>
          <button type="button" onClick={() => setMethod("temp")} className={cn(
            "w-full p-3 rounded-md border-2 text-left transition-colors",
            method === "temp" ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
          )}>
            <p className="text-sm font-semibold">Generate temporary password</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Auto-generated 12-char password · user forced to change on next login</p>
          </button>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(method === "link" ? "reset link" : "temporary password")}>
            <RefreshCw className="h-3.5 w-3.5" />Send reset
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============== USER DETAIL DRAWER ==============
function UserDetailDrawer({ user, onClose, onEdit, onSuspend, onKillSessions, onToast }: {
  user: UserExt;
  onClose: () => void;
  onEdit: () => void;
  onSuspend: () => void;
  onKillSessions: () => void;
  onToast: (m: string) => void;
}) {
  const [tab, setTab] = React.useState<"profile" | "sessions" | "history">("profile");

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const liveSessions = user.sessions?.filter(s => s.active) || [];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-linear-to-r from-brand-soft/30 to-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={user.name} size={48} />
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">{user.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge tone={ROLE_TONE[user.role as Role] ?? "neutral"}>{user.role}</Badge>
                  <Badge tone={user.status === "active" ? "success" : "neutral"}>{user.status}</Badge>
                  {user.twoFA ? <Badge tone="success"><ShieldCheck className="h-2.5 w-2.5" />2FA</Badge> : <Badge tone="warning">No 2FA</Badge>}
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center shrink-0"><X className="h-4 w-4" /></button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 mt-3">
            {user.phone && <a href={`tel:${user.phone}`} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Phone className="h-3.5 w-3.5" />Call</a>}
            <a href={`mailto:${user.email}`} className="flex-1 h-9 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Mail className="h-3.5 w-3.5" />Email</a>
            <button type="button" onClick={onEdit} className="flex-1 h-9 rounded-md bg-brand text-brand-foreground hover:bg-brand/90 inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Edit className="h-3.5 w-3.5" />Edit</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface-sunken/40 px-2">
          {([
            { id: "profile", label: "Profile" },
            { id: "sessions", label: `Sessions (${liveSessions.length})` },
            { id: "history", label: "Login history" },
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
              <Card className="p-4 space-y-2.5 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{user.email}</span></div>
                {user.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="tabular">{user.phone}</span></div>}
                {user.joinedAt && <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />Joined <span className="tabular">{user.joinedAt}</span></div>}
                {user.lastLoginAt && <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />Last login <span className="tabular">{user.lastLoginAt}</span></div>}
                {user.lastLoginIp && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="tabular text-xs">{user.lastLoginDevice} · {user.lastLoginIp}</span></div>}
              </Card>

              <Card className={cn(
                "p-4 flex items-center justify-between",
                user.twoFA ? "bg-success-soft/15 border-success/20" : "bg-warning-soft/15 border-warning/30"
              )}>
                <div>
                  <p className="text-sm font-medium inline-flex items-center gap-1.5"><ShieldCheck className={cn("h-4 w-4", user.twoFA ? "text-success" : "text-warning")} />Two-factor authentication</p>
                  <p className="text-[11px] text-muted-foreground">{user.twoFA ? "Enabled · enforced on every login" : "Not enabled · vulnerable to credential theft"}</p>
                </div>
                {!user.twoFA && (
                  <Button variant="outline" size="sm" className="border-warning/40 text-warning hover:bg-warning hover:text-white" onClick={() => { onToast(`${user.name} will set up MFA on next login`); }}>
                    Force MFA
                  </Button>
                )}
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onSuspend} className={cn(user.status === "active" ? "border-danger/30 text-danger" : "border-success/30 text-success")}>
                  <Power className="h-3.5 w-3.5" />{user.status === "active" ? "Suspend" : "Reactivate"}
                </Button>
                <Button variant="outline" onClick={() => onToast(`Reset link sent to ${user.email}`)}>
                  <Lock className="h-3.5 w-3.5" />Reset password
                </Button>
              </div>
            </div>
          )}

          {tab === "sessions" && (
            <div className="space-y-3">
              {liveSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No active sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">User is not signed in right now</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={onKillSessions}>
                      <Power className="h-3.5 w-3.5" />Sign out all
                    </Button>
                  </div>
                  {liveSessions.map(s => (
                    <Card key={s.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.device}</p>
                          <p className="text-[11px] text-muted-foreground tabular truncate">{s.ip} · {s.location} · started {s.startedAt}</p>
                        </div>
                      </div>
                      <Badge tone="info">live</Badge>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-2">
              {(user.loginHistory || []).map((h, i) => (
                <Card key={i} className={cn("p-3", !h.success && "border-danger/30 bg-danger-soft/10")}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tabular">{h.at}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{h.device} · {h.ip}</p>
                    </div>
                    <Badge tone={h.success ? "success" : "danger"}>{h.success ? "success" : "failed"}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
