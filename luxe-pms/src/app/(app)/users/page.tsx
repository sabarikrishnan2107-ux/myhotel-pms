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
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";

// Roles are master data from Configuration → Roles & Permissions (/roles).
type Role = string;
type Tone = "brand" | "info" | "neutral" | "accent" | "warning" | "success";

const ROLE_TONE: Record<string, Tone> = {
  Owner: "brand", Manager: "info", Reception: "neutral",
  Accounts: "accent", Housekeeping: "warning", Restaurant: "success",
};
// Deterministic colour for any role (known ones keep their colour).
const TONE_CYCLE: Tone[] = ["brand", "info", "accent", "warning", "success", "neutral"];
function roleTone(name: string): Tone {
  if (ROLE_TONE[name]) return ROLE_TONE[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % TONE_CYCLE.length;
  return TONE_CYCLE[h];
}

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
  // Master roles from Configuration → Roles & Permissions.
  const [roles, setRoles] = React.useState<{ id: string; name: string }[]>([]);
  const roleNames = roles.map(r => r.name);
  React.useEffect(() => {
    apiGet<(SeededUser & { phone?: string; joinedAt?: string })[]>("/staff-accounts")
      .then(rows => setUsers(rows.map((r, i) => enrich({ ...r, id: String(r.id) }, i))))
      .catch(() => {});
    apiGet<{ id: number | string; name: string }[]>("/roles")
      .then(rows => setRoles(rows.map(r => ({ id: String(r.id), name: r.name })))).catch(() => {});
  }, []);
  const [newRoleOpen, setNewRoleOpen] = React.useState(false);
  const createRole = (name: string) => {
    apiPost<{ id: number | string; name: string }>("/roles", { name, permissions: [] })
      .then(r => { setRoles(prev => [...prev, { id: String(r.id), name: r.name }]); showToast(`Role "${name}" created`); })
      .catch(() => showToast("⚠ Could not create role — backend offline"));
    setNewRoleOpen(false);
  };
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | Status>("all");

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editUser, setEditUser] = React.useState<UserExt | null>(null);
  const [detailUser, setDetailUser] = React.useState<UserExt | null>(null);
  const [resetUser, setResetUser] = React.useState<UserExt | null>(null);
  const [actionFor, setActionFor] = React.useState<{ id: string; top: number; left: number; up: boolean } | null>(null);
  // Anchor the action menu to the clicked button in fixed coords so it never
  // gets clipped by the table's overflow and flips up near the viewport bottom.
  const openActionMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (actionFor?.id === id) { setActionFor(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const MENU_W = 192, MENU_H = 300;
    const up = r.bottom + MENU_H > window.innerHeight;
    setActionFor({ id, top: up ? r.top - 4 : r.bottom + 4, left: Math.max(8, r.right - MENU_W), up });
  };
  React.useEffect(() => {
    if (!actionFor) return;
    const close = () => setActionFor(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [actionFor]);
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

  const DB_FIELDS = ["name", "email", "role", "department", "status", "last", "twoFA", "phone", "joinedAt"];
  const update = (id: string, patch: Partial<UserExt>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    const dbPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => DB_FIELDS.includes(k)));
    if (Object.keys(dbPatch).length) apiPut(`/staff-accounts/${id}`, dbPatch).catch(() => {});
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

  const handleInvite = (data: { name: string; email: string; password: string; role: Role; department: string; phone: string; sendEmail: boolean; sendWhatsApp: boolean }) => {
    const draft = {
      name: data.name, email: data.email, password: data.password, role: data.role,
      department: data.department || null, status: "active", phone: data.phone,
    };
    apiPost<SeededUser>("/staff-accounts", draft)
      .then(row => setUsers(prev => [enrich({ ...row, id: String(row.id) }, prev.length), ...prev]))
      .catch(() => showToast("Could not create account — email may already exist"));
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
    apiPut(`/staff-accounts/${u.id}`, dbPatch).catch(() => showToast("Could not save changes"));
    setEditUser(null);
    showToast(`${u.name} updated`);
  };

  const activeFilters = (search ? 1 : 0) + (roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const [orgOpen, setOrgOpen] = React.useState(false);
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  // Parse a CSV (header: name,email,role,phone) and create each user in the DB.
  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) { showToast("CSV is empty"); return; }
    const header = lines[0].toLowerCase().split(",").map(h => h.trim());
    const col = (name: string) => header.indexOf(name);
    const [iName, iEmail, iRole, iPhone] = [col("name"), col("email"), col("role"), col("phone")];
    if (iName < 0 || iEmail < 0) { showToast("CSV needs at least name,email columns"); return; }
    const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim()));
    let ok = 0;
    for (const r of rows) {
      const draft = { name: r[iName], email: r[iEmail], role: (iRole >= 0 && r[iRole]) || roleNames[0] || "Reception", phone: iPhone >= 0 ? r[iPhone] : "", status: "active" as const, twoFA: false, last: "Never" };
      if (!draft.name || !draft.email) continue;
      try { const created = await apiPost<SeededUser>("/staff-accounts", draft); setUsers(prev => [...prev, enrich({ ...created, id: String(created.id) }, prev.length)]); ok++; }
      catch { /* skip failed row */ }
    }
    showToast(ok ? `Imported ${ok} user${ok === 1 ? "" : "s"} from CSV` : "No users imported");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Staff accounts · roles · 2FA · sessions · activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOrgOpen(true)}>
            <Users className="h-4 w-4" />Org chart
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => csvInputRef.current?.click()}>
            <Upload className="h-4 w-4" />Import CSV
          </Button>
          <Button variant="outline" onClick={() => setNewRoleOpen(true)}>
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
            toEnforce.forEach(u => apiPut(`/staff-accounts/${u.id}`, { twoFA: true }).catch(() => {}));
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
        <KPICard label="2FA coverage" value={`${users.length ? Math.round(twoFA / users.length * 100) : 0}%`} icon={ShieldCheck} accent={users.length > 0 && twoFA / users.length >= 0.75 ? "success" : "warning"} hint={`${twoFA} of ${users.length}`} />
        <KPICard label="Live sessions" value={sessionsNow} icon={Activity} accent="info" hint="signed in now" />
        <KPICard label="Roles defined" value={roles.length} icon={KeySquare} accent="accent" />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", ...roleNames].map(r => (
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
                    <td className="px-4 py-3"><Badge tone={roleTone(u.role)}>{u.role}</Badge></td>
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
                        <button type="button" onClick={(e) => openActionMenu(u.id, e)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="More">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {actionFor?.id === u.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActionFor(null)} />
                            <div style={{ top: actionFor.top, left: actionFor.left, transform: actionFor.up ? "translateY(-100%)" : undefined }} className="fixed w-48 bg-surface border border-border rounded-md shadow-xl z-50 py-1 text-sm">
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
      {inviteOpen && <InviteModal roles={roleNames} onClose={() => setInviteOpen(false)} onSave={handleInvite} />}
      {editUser && <EditUserModal user={editUser} roles={roleNames} onClose={() => setEditUser(null)} onSave={handleEditSave} />}
      {newRoleOpen && <NewRoleModal existing={roleNames} onClose={() => setNewRoleOpen(false)} onSave={createRole} />}
      {orgOpen && <OrgChartModal roles={roleNames} users={users} onClose={() => setOrgOpen(false)} />}
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
function InviteModal({ onClose, onSave, roles }: {
  onClose: () => void;
  onSave: (data: { name: string; email: string; password: string; role: Role; department: string; phone: string; sendEmail: boolean; sendWhatsApp: boolean }) => void;
  roles: string[];
}) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [role, setRole] = React.useState<Role>(roles[0] ?? "");
  const [sendEmail, setSendEmail] = React.useState(true);
  const [sendWhatsApp, setSendWhatsApp] = React.useState(true);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const valid = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && password.length >= 8 && !!role && isValidPhone(phone);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><UserPlus className="h-4 w-4" /></span>
            <div>
              <h3 className="font-semibold">Create staff account</h3>
              <p className="text-xs text-muted-foreground">Sets email + password + role so they can log in</p>
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
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Password * (min 8)</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a login password" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Housekeeping" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone (for WhatsApp invite)</Label>
            <PhoneInput value={phone} onChange={v => setPhone(v)} size="sm" invalid={phone !== "" && !isValidPhone(phone)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role *</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {roles.map(r => (
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
            <p className="text-muted-foreground">A real login account is created immediately with this email + password and the selected role. The role decides which pages they can access (configure in Setup → Roles &amp; Permissions).</p>
          </Card>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, email, password, role, department, phone, sendEmail, sendWhatsApp })} disabled={!valid}>
            <UserPlus className="h-3.5 w-3.5" />Create account
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============== EDIT USER MODAL ==============
function EditUserModal({ user, onClose, onSave, roles }: {
  user: UserExt;
  onClose: () => void;
  onSave: (u: UserExt) => void;
  roles: string[];
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
            <PhoneInput value={form.phone || ""} onChange={v => update("phone", v)} size="sm" invalid={!!form.phone && !isValidPhone(form.phone)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={form.role} onChange={e => update("role", e.target.value)} className="h-9">
              {roles.map(r => <option key={r}>{r}</option>)}
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

// ============== ORG CHART MODAL ==============
function OrgChartModal({ roles, users, onClose }: {
  roles: string[];
  users: UserExt[];
  onClose: () => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="font-semibold">Org chart</h3>
            <p className="text-xs text-muted-foreground">{users.length} staff across {roles.length} roles</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {roles.map(r => {
            const members = users.filter(u => u.role === r);
            return (
              <div key={r}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge tone={roleTone(r)}>{r}</Badge>
                  <span className="text-xs text-muted-foreground">{members.length} {members.length === 1 ? "person" : "people"}</span>
                </div>
                {members.length === 0
                  ? <p className="text-xs text-muted-foreground pl-1">No staff assigned</p>
                  : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                          <Avatar name={m.name} size={28} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============== NEW ROLE MODAL ==============
function NewRoleModal({ existing, onClose, onSave }: {
  existing: string[];
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  const trimmed = name.trim();
  const dup = existing.some(r => r.toLowerCase() === trimmed.toLowerCase());
  const valid = trimmed.length > 1 && !dup;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="font-semibold">New role</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Role name *</Label>
            <Input value={name} autoFocus placeholder="e.g. Night Auditor" onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && valid) onSave(trimmed); }} />
            {dup && <p className="text-xs text-warning">A role with that name already exists.</p>}
            <p className="text-xs text-muted-foreground">Saved to Configuration → Roles &amp; Permissions; set its permissions there.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid} onClick={() => onSave(trimmed)}><Plus className="h-4 w-4" />Create role</Button>
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
                  <Badge tone={roleTone(user.role)}>{user.role}</Badge>
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
