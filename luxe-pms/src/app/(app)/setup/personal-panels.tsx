"use client";
import * as React from "react";
import {
  ShieldCheck, Webhook,
  CheckCircle2, Languages, Clock, Keyboard, Lock,
  Smartphone, X, Copy, Trash2, Save, Eye, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiGet, apiPut, apiPost, syncList } from "@/lib/api";
import { useTheme } from "next-themes";
import { applyAppearance, setPrefsCache } from "@/lib/preferences";
import { setDateTimePrefs } from "@/lib/utils";

// Loads a single-row settings section from Postgres on mount, and returns a
// save() that persists the current values. `hydrate` applies a loaded blob.
export function useSettingsPersistence<T extends Record<string, unknown>>(
  key: string,
  current: T,
  hydrate: (v: Partial<T>) => void,
) {
  const hydrateRef = React.useRef(hydrate);
  React.useEffect(() => { hydrateRef.current = hydrate; });
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Partial<T>>(`/settings/${key}`)
      .then(v => { if (!cancelled && v && Object.keys(v).length) hydrateRef.current(v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key]);
  return (showToast: (m: string) => void) =>
    apiPut(`/settings/${key}`, current)
      .then(() => showToast("Saved to database ✓"))
      .catch(() => showToast("⚠ Save failed — backend offline"));
}

const SHORTCUTS = [
  { keys: ["⌘", "K"], action: "Global search" },
  { keys: ["G", "D"], action: "Go to Dashboard" },
  { keys: ["G", "B"], action: "Go to Bookings" },
  { keys: ["G", "R"], action: "Go to Room Rack" },
  { keys: ["G", "F"], action: "Go to Folios" },
  { keys: ["N", "B"], action: "New Booking" },
  { keys: ["Esc"], action: "Close modal / blur search" },
  { keys: ["?"], action: "Show all shortcuts" },
];

// Shared local toast hook — each panel renders only when its section is active,
// so a single bottom-right toast per panel is fine.
function useToast() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const ToastEl = toast ? (
    <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span className="font-medium">{toast}</span>
    </div>
  ) : null;
  return { showToast, ToastEl };
}

// ============== MY PREFERENCES ==============
export function PreferencesPanel() {
  const { showToast, ToastEl } = useToast();
  const [language, setLanguage] = React.useState("English");
  const [timezone, setTimezone] = React.useState("Asia/Kolkata (IST)");
  const [dateFormat, setDateFormat] = React.useState("DD/MM/YYYY");
  const [timeFormat, setTimeFormat] = React.useState("24-hour");
  const [density, setDensity] = React.useState<"compact" | "cozy" | "comfortable">("cozy");
  const [landing, setLanding] = React.useState("/dashboard");
  const [highContrast, setHighContrast] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [textSize, setTextSize] = React.useState(100);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  // next-themes owns the real theme (.dark class + persistence). The buttons
  // below drive it directly so they actually switch the app and stay in sync
  // with the top-bar toggle. The active button reflects next-themes' value.
  const { theme: ntTheme, setTheme: setNtTheme } = useTheme();
  const activeTheme: "light" | "dark" | "auto" =
    ntTheme === "light" || ntTheme === "dark" ? ntTheme : "auto";
  const chooseTheme = (t: "light" | "dark" | "auto") => {
    setNtTheme(t === "auto" ? "system" : t);
  };

  // Live-apply appearance + accessibility to the document as the user tweaks
  // them, so changes are visible immediately (persisted on Save). Theme is NOT
  // a dependency here — it's owned by next-themes; coupling them would re-toggle
  // <html> classes on every theme change and loop with next-themes' own class
  // management.
  React.useEffect(() => {
    applyAppearance({ density, textSize, highContrast, reducedMotion });
    setPrefsCache({ density, textSize, highContrast, reducedMotion });
  }, [density, textSize, highContrast, reducedMotion]);

  // Keep the date/time formatter cache in sync as the user changes locale prefs.
  React.useEffect(() => {
    setDateTimePrefs({ dateFormat, timeFormat, timezone });
  }, [dateFormat, timeFormat, timezone]);

  const save = useSettingsPersistence(
    "preferences",
    { language, timezone, dateFormat, timeFormat, density, theme: activeTheme, landing, highContrast, reducedMotion, textSize },
    v => {
      if (v.language !== undefined) setLanguage(v.language);
      if (v.timezone !== undefined) setTimezone(v.timezone);
      if (v.dateFormat !== undefined) setDateFormat(v.dateFormat);
      if (v.timeFormat !== undefined) setTimeFormat(v.timeFormat);
      if (v.density !== undefined) setDensity(v.density);
      if (v.theme !== undefined) setNtTheme(v.theme === "auto" ? "system" : v.theme);
      if (v.landing !== undefined) setLanding(v.landing);
      if (v.highContrast !== undefined) setHighContrast(v.highContrast);
      if (v.reducedMotion !== undefined) setReducedMotion(v.reducedMotion);
      if (v.textSize !== undefined) setTextSize(v.textSize);
    },
  );

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">My preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">Per-user · only affects your view of MYHOTEL</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field2 label={<><Languages className="h-3 w-3 inline mr-1" />Language</>}>
          <Select value={language} onChange={e => setLanguage(e.target.value)} className="h-9">
            <option>English</option><option>हिन्दी (Hindi)</option><option>मराठी (Marathi)</option>
            <option>தமிழ் (Tamil)</option><option>తెలుగు (Telugu)</option><option>العربية (Arabic)</option>
          </Select>
        </Field2>
        <Field2 label={<><Clock className="h-3 w-3 inline mr-1" />Timezone</>}>
          <Select value={timezone} onChange={e => setTimezone(e.target.value)} className="h-9">
            <option>Asia/Kolkata (IST)</option><option>Asia/Dubai (GMT+4)</option>
            <option>Asia/Singapore</option><option>Europe/London (GMT)</option>
          </Select>
        </Field2>
        <Field2 label="Date format">
          <Select value={dateFormat} onChange={e => setDateFormat(e.target.value)} className="h-9">
            <option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option><option>DD MMM YYYY</option>
          </Select>
        </Field2>
        <Field2 label="Time format">
          <Select value={timeFormat} onChange={e => setTimeFormat(e.target.value)} className="h-9">
            <option>24-hour</option><option>12-hour (AM/PM)</option>
          </Select>
        </Field2>
      </div>

      <hr className="border-border" />
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Appearance</p>
      <Field2 label="Theme">
        <div className="grid grid-cols-3 gap-2">
          {(["light", "dark", "auto"] as const).map(t => (
            <button key={t} type="button" onClick={() => chooseTheme(t)} className={cn(
              "h-10 rounded-md border text-xs font-medium capitalize transition-colors",
              activeTheme === t ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
            )}>{t === "auto" ? "System" : t}</button>
          ))}
        </div>
      </Field2>

      <Field2 label="UI density">
        <div className="grid grid-cols-3 gap-2">
          {(["compact", "cozy", "comfortable"] as const).map(d => (
            <button key={d} type="button" onClick={() => setDensity(d)} className={cn(
              "h-12 rounded-md border-2 text-left px-3 transition-colors",
              density === d ? "border-brand bg-brand-soft/30" : "border-border hover:bg-surface-sunken"
            )}>
              <p className="text-xs font-semibold capitalize">{d}</p>
              <p className="text-[10px] text-muted-foreground">{d === "compact" ? "more rows" : d === "cozy" ? "balanced" : "more breathing room"}</p>
            </button>
          ))}
        </div>
      </Field2>

      <Field2 label="Text size">
        <div className="flex items-center gap-3">
          <input type="range" min={85} max={130} step={5} value={textSize} onChange={e => setTextSize(Number(e.target.value))} className="flex-1 accent-current" />
          <span className="tabular text-sm font-medium w-12 text-right">{textSize}%</span>
        </div>
      </Field2>

      <hr className="border-border" />
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Accessibility</p>
      <Toggle on={highContrast} onChange={setHighContrast} label="High contrast mode" hint="Increases contrast ratio for better readability" />
      <Toggle on={reducedMotion} onChange={setReducedMotion} label="Reduce motion" hint="Disables transitions and animations" />

      <hr className="border-border" />
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Defaults</p>
      <Field2 label="Default landing page (after login)">
        <Select value={landing} onChange={e => setLanding(e.target.value)} className="h-9">
          <option value="/dashboard">Dashboard</option><option value="/rack">Room Rack</option>
          <option value="/bookings">Bookings</option><option value="/calendar">Reservation Calendar</option>
          <option value="/checkin">Check-in</option>
        </Select>
      </Field2>

      <Field2 label={<><Keyboard className="h-3 w-3 inline mr-1" />Keyboard shortcuts</>}>
        <Button variant="outline" onClick={() => setShortcutsOpen(true)}><Keyboard className="h-3.5 w-3.5" />View all shortcuts</Button>
      </Field2>

      <SaveBar onCancel={() => showToast("Preferences reverted")} onSave={() => save(showToast)} />

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {ToastEl}
    </Card>
  );
}

// ============== SECURITY & SIGN-IN ==============
export function SecurityPanel() {
  const { showToast, ToastEl } = useToast();
  const [require2fa, setRequire2fa] = React.useState(false);
  const [sso, setSso] = React.useState(false);
  const [sessionMin, setSessionMin] = React.useState(60);
  const [lockoutAfter, setLockoutAfter] = React.useState(5);
  const [policy, setPolicy] = React.useState("Strong (12 + symbol)");
  const [changePassOpen, setChangePassOpen] = React.useState(false);
  const [twoFaOpen, setTwoFaOpen] = React.useState(false);

  const save = useSettingsPersistence(
    "security",
    { require2fa, sso, sessionMin, lockoutAfter, policy },
    v => {
      if (v.require2fa !== undefined) setRequire2fa(v.require2fa);
      if (v.sso !== undefined) setSso(v.sso);
      if (v.sessionMin !== undefined) setSessionMin(v.sessionMin);
      if (v.lockoutAfter !== undefined) setLockoutAfter(v.lockoutAfter);
      if (v.policy !== undefined) setPolicy(v.policy);
    },
  );

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Security &amp; sign-in</h2>
        <p className="text-sm text-muted-foreground mt-1">2FA · session control · password policy · change password</p>
      </div>

      <div className="rounded-md border border-border p-3 space-y-2">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">My account</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm">Two-factor authentication</p>
          <Button variant="outline" size="sm" onClick={() => setTwoFaOpen(true)}>
            <Smartphone className="h-3.5 w-3.5" />Manage
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">Password</p>
          <Button variant="outline" size="sm" onClick={() => setChangePassOpen(true)}>
            <Lock className="h-3.5 w-3.5" />Change password
          </Button>
        </div>
      </div>

      <Toggle on={require2fa} onChange={setRequire2fa} label="Require 2FA for all users" hint="Manager and Owner already enforced" />
      <Toggle on={sso} onChange={setSso} label="SSO via WorkOS" hint="Enterprise SAML / OIDC" />
      <div className="grid grid-cols-2 gap-3">
        <Field2 label="Session timeout (minutes)">
          <Input type="number" value={sessionMin} onChange={e => setSessionMin(Math.max(5, Number(e.target.value) || 0))} className="h-9 tabular" />
        </Field2>
        <Field2 label="Lockout after failed attempts">
          <Input type="number" value={lockoutAfter} onChange={e => setLockoutAfter(Math.max(3, Number(e.target.value) || 0))} className="h-9 tabular" />
        </Field2>
      </div>
      <Field2 label="Password policy">
        <Select value={policy} onChange={e => setPolicy(e.target.value)} className="h-9">
          <option>Standard (min 8 chars)</option>
          <option>Strong (12 + symbol)</option>
          <option>Enterprise (16 + symbol + rotated 90d)</option>
        </Select>
      </Field2>
      <SaveBar onCancel={() => showToast("Security settings reverted")} onSave={() => save(showToast)} />

      {changePassOpen && <ChangePasswordModal onClose={() => setChangePassOpen(false)} onSave={() => { setChangePassOpen(false); showToast("Password changed · you stay signed in"); }} />}
      {twoFaOpen && <TwoFAModal onClose={() => setTwoFaOpen(false)} onSave={() => { setTwoFaOpen(false); showToast("2FA enabled · authenticator app linked"); }} />}
      {ToastEl}
    </Card>
  );
}

// ============== NOTIFICATION CHANNELS & QUIET HOURS ==============
export function NotificationChannelsPanel() {
  const { showToast, ToastEl } = useToast();
  const [emailOn, setEmailOn] = React.useState(true);
  const [waOn, setWaOn] = React.useState(true);
  const [tgOn, setTgOn] = React.useState(true);
  const [smsOn, setSmsOn] = React.useState(false);
  const [quietStart, setQuietStart] = React.useState("22:00");
  const [quietEnd, setQuietEnd] = React.useState("07:00");

  const save = useSettingsPersistence(
    "channels",
    { emailOn, waOn, tgOn, smsOn, quietStart, quietEnd },
    v => {
      if (v.emailOn !== undefined) setEmailOn(v.emailOn);
      if (v.waOn !== undefined) setWaOn(v.waOn);
      if (v.tgOn !== undefined) setTgOn(v.tgOn);
      if (v.smsOn !== undefined) setSmsOn(v.smsOn);
      if (v.quietStart !== undefined) setQuietStart(v.quietStart);
      if (v.quietEnd !== undefined) setQuietEnd(v.quietEnd);
    },
  );

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Notification channels</h2>
        <p className="text-sm text-muted-foreground mt-1">Delivery channels &amp; quiet hours. Message wording lives in Notification Templates.</p>
      </div>
      <Toggle on={emailOn} onChange={setEmailOn} label="Email — Postmark" hint="Configured · transactional templates" />
      <Toggle on={waOn} onChange={setWaOn} label="WhatsApp Cloud API" hint="Configured · 8 approved templates" />
      <Toggle on={tgOn} onChange={setTgOn} label="Telegram (Owner alerts)" hint="Bot connected" />
      <Toggle on={smsOn} onChange={setSmsOn} label="SMS fallback" hint="When WhatsApp delivery fails" />
      <div className="pt-3 border-t border-border space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field2 label="Quiet hours start"><Input type="time" value={quietStart} onChange={e => setQuietStart(e.target.value)} className="h-9 tabular" /></Field2>
          <Field2 label="Quiet hours end"><Input type="time" value={quietEnd} onChange={e => setQuietEnd(e.target.value)} className="h-9 tabular" /></Field2>
        </div>
        <p className="text-xs text-muted-foreground">No notifications sent during quiet hours except urgent alerts.</p>
      </div>
      <SaveBar onCancel={() => showToast("Notifications reverted")} onSave={() => save(showToast)} />
      {ToastEl}
    </Card>
  );
}

// ============== WEBHOOKS ==============
type Wh = { id: number | string; url: string; events: string; status: string };

export function WebhooksPanel() {
  const { showToast, ToastEl } = useToast();
  const [webhooks, setWebhooks] = React.useState<Wh[]>([
    { id: "w1", url: "https://hooks.zapier.com/...", events: "booking.created, payment.received", status: "active" },
    { id: "w2", url: "https://my-bi.example.com/wh", events: "night_audit.completed", status: "active" },
  ]);
  const [newWebhookOpen, setNewWebhookOpen] = React.useState(false);

  // Load from Postgres on mount; persist each add/remove back to the DB.
  React.useEffect(() => {
    let cancelled = false;
    apiGet<Wh[]>("/webhooks").then(r => { if (!cancelled) setWebhooks(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const persist = (next: Wh[]) => {
    setWebhooks(next);
    syncList("webhooks", webhooks, next)
      .then(setWebhooks)
      .catch(() => showToast("⚠ Save failed — backend offline"));
  };

  return (
    <Card className="p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground mt-1">Outgoing event webhooks · for custom integrations</p>
        </div>
        <Button onClick={() => setNewWebhookOpen(true)}><Webhook className="h-4 w-4" />Add webhook</Button>
      </div>
      {webhooks.map(w => (
        <div key={w.id} className="p-3 rounded-md border border-border">
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-muted-foreground truncate">{w.url}</code>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge tone="success">{w.status}</Badge>
              <button type="button" onClick={() => showToast(`Webhook URL revealed · ${w.url}`)} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="View full URL">
                <Eye className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(w.url); showToast("Webhook URL copied"); }} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Copy URL">
                <Copy className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => { persist(webhooks.filter(x => x.id !== w.id)); showToast("Webhook removed"); }} className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center text-muted-foreground">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{w.events}</p>
        </div>
      ))}
      {newWebhookOpen && <NewWebhookModal onClose={() => setNewWebhookOpen(false)} onSave={(url, events) => {
        persist([...webhooks, { id: `new-${webhooks.length + 1}`, url, events, status: "active" }]);
        setNewWebhookOpen(false);
        showToast("Webhook added");
      }} />}
      {ToastEl}
    </Card>
  );
}

// ============== HELPERS ==============
function Field2({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="w-full flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-surface-sunken transition-colors">
      <div className="text-left">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        on ? "bg-success justify-end" : "bg-zinc-300 dark:bg-zinc-600 justify-start"
      )}>
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}

function SaveBar({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-3 border-t border-border">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave}><Save className="h-3.5 w-3.5" />Save changes</Button>
    </div>
  );
}

// ============== MODALS ==============
function ChangePasswordModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [current, setCurrent] = React.useState("");
  const [newP, setNewP] = React.useState("");
  const [confirmP, setConfirmP] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const valid = current.length > 0 && newP.length >= 12 && newP === confirmP;
  React.useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiPost("/change-password", { current_password: current, new_password: newP });
      onSave();
    } catch {
      setError("Current password is incorrect (or the new one is too short).");
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-warning-soft text-warning inline-flex items-center justify-center"><Lock className="h-4 w-4" /></span>
            <h3 className="font-semibold">Change password</h3>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field2 label="Current password"><Input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="h-9" autoFocus /></Field2>
          <Field2 label="New password"><Input type="password" value={newP} onChange={e => setNewP(e.target.value)} className="h-9" /></Field2>
          <Field2 label="Confirm new password"><Input type="password" value={confirmP} onChange={e => setConfirmP(e.target.value)} className="h-9" /></Field2>
          <div className="text-[11px] text-muted-foreground space-y-0.5 pl-2">
            <p className={newP.length >= 12 ? "text-success" : ""}>• At least 12 characters</p>
            <p className={/[A-Z]/.test(newP) ? "text-success" : ""}>• Uppercase letter</p>
            <p className={/[0-9]/.test(newP) ? "text-success" : ""}>• Number</p>
            <p className={/[^a-zA-Z0-9]/.test(newP) ? "text-success" : ""}>• Symbol</p>
            <p className={newP === confirmP && newP.length > 0 ? "text-success" : ""}>• Passwords match</p>
          </div>
          {error && <p className="text-xs text-danger flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || saving}>{saving ? "Updating…" : "Update password"}</Button>
        </div>
      </div>
    </div>
  );
}

function TwoFAModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [code, setCode] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  // Ask the backend for a fresh secret to set up against.
  React.useEffect(() => {
    apiPost<{ secret: string; otpauth: string }>("/2fa/setup", {})
      .then(r => setSecret(r.secret))
      .catch(() => setError("Couldn't start 2FA setup — is the backend running?"));
  }, []);

  const enable = async () => {
    setError(null);
    setSaving(true);
    try {
      await apiPost("/2fa/enable", { code });
      onSave();
    } catch {
      setError("That code is invalid or expired. Check your authenticator app.");
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-success-soft text-success inline-flex items-center justify-center"><Smartphone className="h-4 w-4" /></span>
            <h3 className="font-semibold">Set up two-factor</h3>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2"><span className="h-5 w-5 rounded-full bg-brand text-brand-foreground inline-flex items-center justify-center text-[10px] font-bold shrink-0">1</span>Open your authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
            <li className="flex gap-2"><span className="h-5 w-5 rounded-full bg-brand text-brand-foreground inline-flex items-center justify-center text-[10px] font-bold shrink-0">2</span>Scan the QR code below or enter the secret manually</li>
          </ol>
          <div className="bg-surface-sunken/40 p-4 rounded-md flex items-center gap-4">
            <div className="h-24 w-24 bg-white p-2 rounded-md grid grid-cols-6 grid-rows-6 gap-px shrink-0">
              {Array.from({ length: 36 }, (_, i) => (
                <div key={i} className="bg-foreground" style={{ opacity: (i * 7919 + 12345) % 13 < 6 ? 1 : 0 }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Secret key</p>
              <p className="font-mono tabular text-sm break-all">{secret || "loading…"}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Algorithm: SHA-1 · digits: 6 · period: 30s</p>
            </div>
          </div>
          <Field2 label="Enter the 6-digit code from your app">
            <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="h-10 text-lg tabular font-mono tracking-wider text-center" placeholder="000000" />
          </Field2>
          {error && <p className="text-xs text-danger flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={enable} disabled={code.length !== 6 || saving}>
            <ShieldCheck className="h-3.5 w-3.5" />{saving ? "Verifying…" : "Enable 2FA"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            <h3 className="font-semibold">Keyboard shortcuts</h3>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          <ul className="space-y-1.5">
            {SHORTCUTS.map(s => (
              <li key={s.action} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                <span className="text-sm">{s.action}</span>
                <div className="flex gap-1">
                  {s.keys.map((k, i) => (
                    <kbd key={i} className="h-6 min-w-6 px-1.5 rounded border border-border bg-surface-sunken text-[11px] font-mono inline-flex items-center justify-center">{k}</kbd>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function NewWebhookModal({ onClose, onSave }: { onClose: () => void; onSave: (url: string, events: string) => void }) {
  const [url, setUrl] = React.useState("https://");
  const [selected, setSelected] = React.useState<string[]>([]);
  const events = ["booking.created", "booking.modified", "booking.cancelled", "payment.received", "payment.refunded", "checkin.completed", "checkout.completed", "night_audit.completed", "folio.locked"];
  const toggle = (e: string) => setSelected(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  React.useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <h3 className="font-semibold">Add webhook</h3>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <Field2 label="Endpoint URL"><Input value={url} onChange={e => setUrl(e.target.value)} className="h-9 font-mono tabular text-xs" /></Field2>
          <div className="space-y-1.5">
            <Label>Events to listen for</Label>
            <div className="flex flex-wrap gap-1.5">
              {events.map(e => (
                <button key={e} type="button" onClick={() => toggle(e)} className={cn(
                  "h-7 px-2.5 rounded-full text-xs font-mono border transition-colors",
                  selected.includes(e) ? "bg-brand text-brand-foreground border-brand" : "border-border hover:bg-surface-sunken"
                )}>{e}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(url, selected.join(", "))} disabled={!url.startsWith("https://") || selected.length === 0}>Save webhook</Button>
        </div>
      </div>
    </div>
  );
}
