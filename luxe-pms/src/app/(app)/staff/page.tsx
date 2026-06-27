"use client";
import * as React from "react";
import {
  Plus, Search, UserCog, Users, Calendar, IndianRupee, Phone, Mail, MessageSquare,
  X, Eye, Edit, CheckCircle2, MoreHorizontal, Power, ShieldCheck, Briefcase,
  MapPin, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { KPICard } from "@/components/ui/kpi-card";
import { STAFF } from "@/lib/mock-data-ext";
import { money, cn } from "@/lib/utils";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/email";

type Staff = typeof STAFF[number];

export default function StaffPage() {
  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Staff | null>(null);
  const [actionFor, setActionFor] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  React.useEffect(() => {
    let cancelled = false;
    apiGet<Staff[]>("/staff").then(r => { if (!cancelled) setStaff(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const depts = Array.from(new Set(staff.map(s => s.dept)));

  const filtered = staff.filter(s => {
    if (search && !`${s.name} ${s.role} ${s.dept} ${s.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== "all" && s.dept !== deptFilter) return false;
    if (statusFilter === "active" && !s.active) return false;
    if (statusFilter === "inactive" && s.active) return false;
    return true;
  });

  const totalSalary = staff.filter(s => s.active).reduce((t, s) => t + s.salary, 0);
  const activeCount = staff.filter(s => s.active).length;
  const newThisMonth = staff.filter(s => s.joined >= "2026-05-01").length;
  const activeFilters = (search ? 1 : 0) + (deptFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const toggleActive = (id: string) => {
    const s = staff.find(x => x.id === id);
    if (!s) return;
    setStaff(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x));
    showToast(`${s.name} ${s.active ? "deactivated" : "reactivated"}`);
    apiPut(`/staff/${id}`, { active: !s.active }).catch(() => showToast("⚠ Save failed — backend offline"));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Staff</h1>
          <p className="text-muted-foreground text-sm mt-1">{staff.length} staff across {depts.length} departments · {activeCount} active</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast("Roster sent to all department heads")}>
            <Calendar className="h-4 w-4" />Shift roster
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add staff</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Active staff" value={activeCount} icon={Users} accent="brand" hint={`${staff.length - activeCount} inactive`} />
        <KPICard label="Departments" value={depts.length} icon={UserCog} accent="info" />
        <KPICard label="Monthly payroll" value={money(totalSalary)} icon={IndianRupee} accent="success" hint="active staff" />
        <KPICard label="Joined this month" value={newThisMonth} icon={Calendar} accent="accent" />
      </div>

      {/* Filter bar */}
      <Card className="p-3 space-y-2.5">
        {/* Dept chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setDeptFilter("all")} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
            deptFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            All departments
            <span className={cn(
              "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
              deptFilter === "all" ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
            )}>{staff.length}</span>
          </button>
          {depts.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)} className={cn(
              "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              deptFilter === d ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>
              {d}
              <span className={cn(
                "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                deptFilter === d ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
              )}>{staff.filter(s => s.dept === d).length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, role, department, email…" className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 w-auto">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setDeptFilter("all"); setStatusFilter("all"); }}>
              <X className="h-3 w-3" />Clear ({activeFilters})
            </Button>
          )}
          <div className="flex-1" />
          <p className="text-xs text-muted-foreground tabular"><span className="font-medium text-foreground">{filtered.length}</span> of {staff.length}</p>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
            <p className="font-medium">No staff match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing filters above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Salary</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id} className={cn("hover:bg-surface-sunken/40 transition-colors cursor-pointer", !s.active && "opacity-50")} onClick={() => setDetail(s)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size={36} />
                      <p className="font-medium">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.role}</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{s.dept}</Badge></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand tabular"><Phone className="h-3 w-3" />{s.phone}</a><br/>
                    <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand truncate max-w-[180px]"><Mail className="h-3 w-3" />{s.email}</a>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular">{s.joined}</td>
                  <td className="px-4 py-3 text-right tabular font-medium">{money(s.salary)}</td>
                  <td className="px-4 py-3"><Badge tone={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex gap-1 items-center relative">
                      <button type="button" onClick={() => setDetail(s)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="View"><Eye className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setActionFor(actionFor === s.id ? null : s.id)} className="h-8 w-8 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="More"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                      {actionFor === s.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setActionFor(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-md shadow-xl z-40 py-1 text-sm">
                            <button onClick={() => { showToast(`Edit profile for ${s.name}`); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Edit className="h-3.5 w-3.5" />Edit profile</button>
                            <button onClick={() => { showToast(`Salary slip for ${s.name} generated`); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" />Generate salary slip</button>
                            <button onClick={() => { showToast(`Leave request opened for ${s.name}`); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />Mark leave</button>
                            <button onClick={() => { showToast(`Attendance log opened for ${s.name}`); setActionFor(null); }} className="w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2"><Clock className="h-3.5 w-3.5" />Attendance</button>
                            <hr className="my-1 border-border" />
                            <button onClick={() => { toggleActive(s.id); setActionFor(null); }} className={cn("w-full px-3 py-1.5 hover:bg-surface-sunken text-left inline-flex items-center gap-2", s.active ? "text-danger" : "text-success")}>
                              <Power className="h-3.5 w-3.5" />{s.active ? "Deactivate" : "Reactivate"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {addOpen && <AddStaffModal onClose={() => setAddOpen(false)} onSave={(s) => {
        const payload = { ...s, joined: new Date().toISOString().slice(0, 10), active: true };
        setAddOpen(false);
        showToast(`${s.name} added to ${s.dept}`);
        apiPost<Staff>("/staff", payload)
          .then(created => setStaff(prev => [created, ...prev]))
          .catch(() => showToast("⚠ Save failed — backend offline"));
      }} departments={depts} />}
      {detail && <StaffDetailDrawer staff={detail} onClose={() => setDetail(null)} onToggleActive={() => { toggleActive(detail.id); setDetail(null); }} onToast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <CheckCircle2 className="h-3.5 w-3.5" />{toast}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADD STAFF MODAL
// ============================================================
function AddStaffModal({ onClose, onSave, departments }: {
  onClose: () => void;
  onSave: (s: Omit<Staff, "id" | "joined" | "active">) => void;
  departments: string[];
}) {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("Reception");
  const [dept, setDept] = React.useState(departments[0] ?? "Front Office");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [salary, setSalary] = React.useState(45000);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const valid = name.trim().length > 1 && email.trim() !== "" && isValidEmail(email) && salary > 0 && isValidPhone(phone);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><UserCog className="h-4 w-4" /></span>
            <div><h3 className="font-semibold">Add staff member</h3><p className="text-xs text-muted-foreground">Onboard to payroll + roster</p></div>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1.5"><Label className="text-xs">Full name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Mehta" className="h-9" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Role *</Label><Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Reception" className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Department *</Label>
              <Select value={dept} onChange={e => setDept(e.target.value)} className="h-9">
                {departments.map(d => <option key={d}>{d}</option>)}
                <option>Front Office</option><option>Housekeeping</option><option>F&B</option><option>Engineering</option><option>Finance</option><option>Sales</option><option>HR</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><PhoneInput value={phone} onChange={v => setPhone(v)} size="sm" invalid={phone !== "" && !isValidPhone(phone)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Email *</Label><EmailInput value={email} onChange={setEmail} placeholder="staff@pearlmarina.com" className="h-9" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Monthly salary (₹) *</Label><Input type="number" min={0} value={salary} onChange={e => setSalary(Math.max(0, Number(e.target.value) || 0))} className="h-9 tabular text-lg font-semibold" /></div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, role, dept, phone, email, salary })} disabled={!valid}>
            <CheckCircle2 className="h-3.5 w-3.5" />Add to payroll
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STAFF DETAIL DRAWER
// ============================================================
function StaffDetailDrawer({ staff, onClose, onToggleActive, onToast }: {
  staff: Staff;
  onClose: () => void;
  onToggleActive: () => void;
  onToast: (m: string) => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Mock derived data
  const tenure = Math.max(0, Math.floor((new Date("2026-05-25").getTime() - new Date(staff.joined).getTime()) / (1000 * 60 * 60 * 24 * 365.25) * 10) / 10);
  const annualSalary = staff.salary * 12;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border bg-linear-to-r from-brand-soft/30 to-surface">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={staff.name} size={48} />
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate">{staff.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{staff.role}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge tone="neutral">{staff.dept}</Badge>
                  <Badge tone={staff.active ? "success" : "neutral"}>{staff.active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-1.5 mt-3">
            <a href={`tel:${staff.phone}`} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Phone className="h-3.5 w-3.5" />Call</a>
            <a href={`mailto:${staff.email}`} className="flex-1 h-9 rounded-md border border-border hover:bg-info hover:text-white hover:border-info inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><Mail className="h-3.5 w-3.5" />Email</a>
            <button type="button" onClick={() => onToast(`WhatsApp opened for ${staff.name}`)} className="flex-1 h-9 rounded-md border border-border hover:bg-success hover:text-white hover:border-success inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors"><MessageSquare className="h-3.5 w-3.5" />WhatsApp</button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center"><Briefcase className="h-4 w-4 mx-auto text-brand mb-1" /><p className="text-lg font-bold tabular">{tenure}y</p><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Tenure</p></Card>
            <Card className="p-3 text-center"><IndianRupee className="h-4 w-4 mx-auto text-success mb-1" /><p className="text-lg font-bold tabular">{money(staff.salary)}</p><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Monthly</p></Card>
            <Card className="p-3 text-center"><IndianRupee className="h-4 w-4 mx-auto text-info mb-1" /><p className="text-lg font-bold tabular">{money(annualSalary)}</p><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Annual</p></Card>
          </div>

          <Card className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="tabular">{staff.phone}</span></div>
            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{staff.email}</span></div>
            <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />Joined <span className="tabular font-medium">{staff.joined}</span></div>
            <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{staff.role} · {staff.dept}</div>
            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />Based at <span className="font-medium">The Pearl Marina · Mumbai</span></div>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onToast(`Salary slip for ${staff.name} downloaded`)}><IndianRupee className="h-3.5 w-3.5" />Salary slip</Button>
            <Button variant="outline" onClick={() => onToast(`Attendance log for ${staff.name} opened`)}><Clock className="h-3.5 w-3.5" />Attendance</Button>
            <Button variant="outline" onClick={() => onToast(`Leave history for ${staff.name} opened`)}><Calendar className="h-3.5 w-3.5" />Leave history</Button>
            <Button variant="outline" onClick={() => onToast(`Form 16 for ${staff.name} generated`)}><ShieldCheck className="h-3.5 w-3.5" />Form 16</Button>
          </div>

          <Button variant="outline" onClick={onToggleActive} className={cn("w-full", staff.active ? "border-danger/30 text-danger" : "border-success/30 text-success")}>
            <Power className="h-3.5 w-3.5" />{staff.active ? "Deactivate staff" : "Reactivate staff"}
          </Button>
        </div>
      </div>
    </div>
  );
}
