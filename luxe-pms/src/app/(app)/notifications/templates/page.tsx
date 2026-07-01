"use client";
import * as React from "react";
import {
  Search, Plus, MessageCircle, CheckCheck, Send, Trash2, Copy, Phone,
  Link, Link as LinkIcon, MessageSquare, AlertCircle, CheckCircle2, Clock, Sparkles,
  Hash, Tag, ChevronRight, Save, RefreshCw, X, Eye, FileText, Megaphone,
  Wrench, History, BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone } from "@/lib/phone";
import { cn, money } from "@/lib/utils";
import { apiGet, apiPut } from "@/lib/api";

type Status = "Approved" | "Pending" | "Rejected";
type Category = "Booking" | "Marketing" | "Utility";
type Language = "English" | "Hindi" | "Marathi";
type ButtonType = "Quick Reply" | "URL" | "Phone";

type TemplateButton = {
  id: string;
  type: ButtonType;
  text: string;
  value?: string; // url or phone
};

type Template = {
  id: string;
  name: string;
  status: Status;
  category: Category;
  language: Language;
  header?: string;
  body: string;
  footer?: string;
  buttons: TemplateButton[];
  rejectionReason?: string;
  lastEdited: string;
  editedBy: string;
  usage30d: number;
  submittedOn?: string;
};

const STATUS_TONE: Record<Status, "success" | "warning" | "danger"> = {
  Approved: "success",
  Pending: "warning",
  Rejected: "danger",
};

const CATEGORY_TONE: Record<Category, "brand" | "accent" | "info"> = {
  Booking: "brand",
  Marketing: "accent",
  Utility: "info",
};

const CATEGORY_ICON: Record<Category, typeof FileText> = {
  Booking: FileText,
  Marketing: Megaphone,
  Utility: Wrench,
};

const LANG_FLAG: Record<Language, string> = {
  English: "EN",
  Hindi: "HI",
  Marathi: "MR",
};

const VARIABLE_CHIPS = [
  { key: "guest_name", label: "Guest Name", sample: "Anjali Iyer" },
  { key: "booking_no", label: "Booking No.", sample: "PRL-48219" },
  { key: "check_in", label: "Check-in", sample: "12 Jun, 2:00 PM" },
  { key: "room", label: "Room", sample: "Deluxe Sea View · 412" },
  { key: "amount", label: "Amount", sample: money(12500) },
  { key: "otp", label: "OTP", sample: "428193" },
];

const SEED_TEMPLATES: Template[] = [
  {
    id: "tpl_01",
    name: "booking_confirmation_v3",
    status: "Approved",
    category: "Booking",
    language: "English",
    header: "Booking Confirmed at The Pearl Marina",
    body: "Dear {{1}}, your booking {{2}} is confirmed for check-in on {{3}}. Room: {{4}}. Total: {{5}}. We look forward to hosting you!",
    footer: "The Pearl Marina · Mumbai",
    buttons: [
      { id: "b1", type: "URL", text: "View Booking", value: "https://pearlmarina.com/b/{{2}}" },
      { id: "b2", type: "Phone", text: "Call Concierge", value: "+912226001234" },
    ],
    lastEdited: "2026-05-28T14:22:00",
    editedBy: "Rohan Sethi",
    usage30d: 1842,
    submittedOn: "2026-04-12",
  },
  {
    id: "tpl_02",
    name: "checkin_otp",
    status: "Approved",
    category: "Utility",
    language: "English",
    body: "Hi {{1}}, your check-in OTP for booking {{2}} is {{3}}. Valid for 10 minutes. Please share this at the reception.",
    footer: "Do not share this OTP with anyone",
    buttons: [],
    lastEdited: "2026-05-30T09:15:00",
    editedBy: "Priya Krishnan",
    usage30d: 967,
    submittedOn: "2026-03-08",
  },
  {
    id: "tpl_03",
    name: "monsoon_offer_2026",
    status: "Pending",
    category: "Marketing",
    language: "English",
    header: "Monsoon Magic · Up to 35% Off",
    body: "Dear {{1}}, escape to The Pearl Marina this monsoon. Suites from {{2}}/night incl. breakfast & spa credit. Book by 15 June.",
    footer: "Reply STOP to opt out",
    buttons: [
      { id: "b1", type: "URL", text: "Book Now", value: "https://pearlmarina.com/monsoon" },
      { id: "b2", type: "Quick Reply", text: "Send Brochure" },
    ],
    lastEdited: "2026-06-01T11:40:00",
    editedBy: "Karan Mehta",
    usage30d: 0,
    submittedOn: "2026-06-01",
  },
  {
    id: "tpl_04",
    name: "checkout_reminder_hi",
    status: "Approved",
    category: "Booking",
    language: "Hindi",
    body: "Namaste {{1}}, aapka check-out aaj {{2}} baje hai. Late check-out ke liye reception se sampark karein. Booking: {{3}}",
    footer: "The Pearl Marina · Mumbai",
    buttons: [
      { id: "b1", type: "Quick Reply", text: "Request Late Checkout" },
      { id: "b2", type: "Phone", text: "Call Reception", value: "+912226001234" },
    ],
    lastEdited: "2026-05-25T16:08:00",
    editedBy: "Anjali Iyer",
    usage30d: 423,
    submittedOn: "2026-02-19",
  },
  {
    id: "tpl_05",
    name: "payment_link",
    status: "Approved",
    category: "Utility",
    language: "English",
    header: "Payment Pending",
    body: "Dear {{1}}, a payment of {{2}} is pending for booking {{3}}. Please complete payment by 6 PM today to confirm your reservation.",
    buttons: [
      { id: "b1", type: "URL", text: "Pay Now", value: "https://pay.pearlmarina.com/{{3}}" },
    ],
    lastEdited: "2026-05-29T18:50:00",
    editedBy: "Rohan Sethi",
    usage30d: 612,
    submittedOn: "2026-03-22",
  },
  {
    id: "tpl_06",
    name: "diwali_greetings_mr",
    status: "Rejected",
    category: "Marketing",
    language: "Marathi",
    header: "Shubh Diwali!",
    body: "Priya {{1}}, The Pearl Marina kadun Diwali chya hardik shubhechha! Khaas suite offer: {{2}}. Aaple swagat ahe.",
    footer: "Reply STOP to opt out",
    buttons: [
      { id: "b1", type: "URL", text: "View Offer", value: "https://pearlmarina.com/diwali" },
    ],
    rejectionReason: "Marketing template contains promotional content without an opt-out hyperlink. Please add a clear opt-out URL or remove promotional pricing.",
    lastEdited: "2026-05-20T10:30:00",
    editedBy: "Karan Mehta",
    usage30d: 0,
    submittedOn: "2026-05-18",
  },
  {
    id: "tpl_07",
    name: "feedback_request",
    status: "Approved",
    category: "Utility",
    language: "English",
    body: "Hi {{1}}, thanks for staying at The Pearl Marina! How was your experience in {{2}}? Your feedback helps us serve you better.",
    footer: "Takes under 30 seconds",
    buttons: [
      { id: "b1", type: "URL", text: "Rate Your Stay", value: "https://pearlmarina.com/feedback/{{2}}" },
      { id: "b2", type: "Quick Reply", text: "Not Now" },
    ],
    lastEdited: "2026-05-15T13:00:00",
    editedBy: "Priya Krishnan",
    usage30d: 738,
    submittedOn: "2026-01-30",
  },
  {
    id: "tpl_08",
    name: "spa_booking_confirm_hi",
    status: "Approved",
    category: "Booking",
    language: "Hindi",
    header: "Spa Booking Pushti",
    body: "{{1}} ji, aapka spa appointment {{2}} ko {{3}} baje confirmed hai. Therapy: {{4}}. Pre-arrival 15 min pehle pohchein.",
    footer: "Pearl Spa · Level 3",
    buttons: [
      { id: "b1", type: "Quick Reply", text: "Reschedule" },
      { id: "b2", type: "Phone", text: "Call Spa", value: "+912226001245" },
    ],
    lastEdited: "2026-05-31T08:20:00",
    editedBy: "Anjali Iyer",
    usage30d: 184,
    submittedOn: "2026-04-02",
  },
  {
    id: "tpl_09",
    name: "loyalty_tier_upgrade",
    status: "Pending",
    category: "Marketing",
    language: "English",
    header: "You're now Pearl Gold!",
    body: "Congrats {{1}}! You've been upgraded to Pearl Gold. Enjoy room upgrades, late check-out & {{2}} in F&B credit on your next stay.",
    footer: "Pearl Rewards · The Pearl Marina",
    buttons: [
      { id: "b1", type: "URL", text: "View Benefits", value: "https://pearlmarina.com/rewards" },
      { id: "b2", type: "Quick Reply", text: "Book a Stay" },
    ],
    lastEdited: "2026-06-02T07:45:00",
    editedBy: "Karan Mehta",
    usage30d: 0,
    submittedOn: "2026-06-02",
  },
  {
    id: "tpl_10",
    name: "booking_confirmation_mr",
    status: "Approved",
    category: "Booking",
    language: "Marathi",
    header: "Booking Pushti · The Pearl Marina",
    body: "Namaskar {{1}}, tumchi booking {{2}} confirm zali ahe. Check-in: {{3}}. Room: {{4}}. Total: {{5}}. Tumcha swagat aahe!",
    footer: "The Pearl Marina · Mumbai",
    buttons: [
      { id: "b1", type: "URL", text: "View Booking", value: "https://pearlmarina.com/b/{{2}}" },
    ],
    lastEdited: "2026-05-22T12:10:00",
    editedBy: "Rohan Sethi",
    usage30d: 256,
    submittedOn: "2026-03-15",
  },
];

function formatEdited(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function renderBodyHighlighted(body: string) {
  const parts = body.split(/(\{\{\d+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{\d+\}\}$/.test(p) ? (
      <span key={i} className="inline-flex items-center bg-accent-soft text-accent rounded px-1.5 py-0.5 text-xs font-mono font-medium mx-0.5">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function fillSampleValues(text: string, sampleMap: Record<string, string>) {
  let out = text;
  Object.entries(sampleMap).forEach(([num, val]) => {
    out = out.replaceAll(`{{${num}}}`, val);
  });
  return out;
}

function getSampleMap(template: Template): Record<string, string> {
  // Map by template name to sensible sample values
  const v: Record<string, string> = {};
  const samples = [
    "Anjali Iyer",
    "PRL-48219",
    "12 Jun, 2:00 PM",
    "Deluxe Sea View · 412",
    money(12500),
    "428193",
  ];
  const matches = template.body.match(/\{\{\d+\}\}/g) || [];
  const uniq = Array.from(new Set(matches));
  uniq.forEach((m, i) => {
    const num = m.replace(/[^0-9]/g, "");
    v[num] = samples[i] ?? `Value ${i + 1}`;
  });
  return v;
}

export default function WhatsAppTemplatesPage() {
  const [toast, setToast] = React.useState<string | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const [templates, setTemplates] = React.useState<Template[]>(SEED_TEMPLATES);
  const [selectedId, setSelectedId] = React.useState<string>(SEED_TEMPLATES[0].id);
  const [search, setSearch] = React.useState("");

  // Load real templates from the backend; fall back to SEED_TEMPLATES offline.
  React.useEffect(() => {
    apiGet<Template[]>("/whatsapp-templates")
      .then((rows) => {
        if (rows.length > 0) {
          const coerced = rows.map((t) => ({ ...t, id: String(t.id) }));
          setTemplates(coerced);
          setSelectedId(coerced[0].id);
        }
      })
      .catch(() => {
        /* offline / API down → keep SEED_TEMPLATES */
      });
  }, []);

  const [filterStatus, setFilterStatus] = React.useState<"All" | Status>("All");
  const [filterCategory, setFilterCategory] = React.useState<"All" | Category>("All");
  const [filterLang, setFilterLang] = React.useState<"All" | Language>("All");
  const [testPhone, setTestPhone] = React.useState("");

  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const filtered = templates.filter((t) => {
    if (filterStatus !== "All" && t.status !== filterStatus) return false;
    if (filterCategory !== "All" && t.category !== filterCategory) return false;
    if (filterLang !== "All" && t.language !== filterLang) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const updateSelected = (patch: Partial<Template>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, ...patch, lastEdited: new Date().toISOString() } : t))
    );
  };

  const insertVariable = (varKey: string) => {
    // Find next variable slot
    const matches = selected.body.match(/\{\{\d+\}\}/g) || [];
    const nums = matches.map((m) => parseInt(m.replace(/[^0-9]/g, ""), 10));
    const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
    updateSelected({ body: selected.body + ` {{${nextNum}}}` });
    showToast(`Inserted {{${varKey}}} as {{${nextNum}}}`);
  };

  const addButton = (type: ButtonType) => {
    if (selected.buttons.length >= 3) {
      showToast("Max 3 buttons allowed");
      return;
    }
    const newBtn: TemplateButton = {
      id: `b${Date.now()}`,
      type,
      text: type === "Quick Reply" ? "Reply" : type === "URL" ? "Visit" : "Call",
      value: type === "URL" ? "https://" : type === "Phone" ? "+91" : undefined,
    };
    updateSelected({ buttons: [...selected.buttons, newBtn] });
    showToast(`Added ${type} button`);
  };

  const removeButton = (id: string) => {
    updateSelected({ buttons: selected.buttons.filter((b) => b.id !== id) });
    showToast("Button removed");
  };

  const updateButton = (id: string, patch: Partial<TemplateButton>) => {
    updateSelected({
      buttons: selected.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  // Persist the currently-edited template to the backend (offline = local-only).
  const saveSelected = () => {
    const { id: _id, ...body } = selected;
    void _id;
    apiPut(`/whatsapp-templates/${selected.id}`, body).catch(() => {
      /* offline / API down → keep local edits only */
    });
    showToast("Draft saved");
  };

  const sampleMap = getSampleMap(selected);
  const previewHeader = selected.header ? fillSampleValues(selected.header, sampleMap) : "";
  const previewBody = fillSampleValues(selected.body, sampleMap);
  const previewFooter = selected.footer || "";

  // KPI counts
  const approvedCount = templates.filter((t) => t.status === "Approved").length;
  const pendingCount = templates.filter((t) => t.status === "Pending").length;
  const rejectedCount = templates.filter((t) => t.status === "Rejected").length;
  const totalUsage = templates.reduce((sum, t) => sum + t.usage30d, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-md">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight">WhatsApp Templates</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              BSP-approved messaging templates · The Pearl Marina · Meta Business
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => showToast("Synced with Meta Business Manager")}>
            <RefreshCw className="h-4 w-4" />
            Sync with Meta
          </Button>
          <Button size="sm" onClick={() => showToast("New template draft created")}>
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-success-soft flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Approved</div>
          </div>
          <div className="text-2xl font-semibold tabular">{approvedCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Active & ready to send</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-warning-soft flex items-center justify-center">
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pending Review</div>
          </div>
          <div className="text-2xl font-semibold tabular">{pendingCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Awaiting BSP approval</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-danger-soft flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-danger" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Rejected</div>
          </div>
          <div className="text-2xl font-semibold tabular">{rejectedCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Needs revision</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-md bg-brand-soft flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-brand-soft-foreground" />
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sent · 30d</div>
          </div>
          <div className="text-2xl font-semibold tabular">{totalUsage.toLocaleString("en-IN")}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Across all templates</div>
        </Card>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Template list */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <Card className="p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select
                className="h-8 text-xs"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "All" | Status)}
              >
                <option value="All">All status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </Select>
              <Select
                className="h-8 text-xs"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as "All" | Category)}
              >
                <option value="All">All types</option>
                <option value="Booking">Booking</option>
                <option value="Marketing">Marketing</option>
                <option value="Utility">Utility</option>
              </Select>
              <Select
                className="h-8 text-xs"
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value as "All" | Language)}
              >
                <option value="All">All langs</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </Select>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {filtered.length} template{filtered.length === 1 ? "" : "s"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Usage · 30d</div>
            </div>
            <div className="max-h-[calc(100vh-26rem)] overflow-y-auto divide-y divide-border">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No templates match your filters
                </div>
              )}
              {filtered.map((t) => {
                const CatIcon = CATEGORY_ICON[t.category];
                const isSelected = t.id === selected.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full text-left p-3 transition-colors hover:bg-surface-sunken/40",
                      isSelected && "bg-brand-soft/40 hover:bg-brand-soft/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                          t.category === "Booking" && "bg-brand-soft text-brand-soft-foreground",
                          t.category === "Marketing" && "bg-accent-soft text-accent",
                          t.category === "Utility" && "bg-info-soft text-info",
                        )}>
                          <CatIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="font-mono text-xs font-medium truncate">{t.name}</div>
                      </div>
                      <Badge tone={STATUS_TONE[t.status]} className="text-[10px] px-1.5 py-0 shrink-0">
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.body}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={CATEGORY_TONE[t.category]} className="text-[10px] px-1.5 py-0">
                          {t.category}
                        </Badge>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1.5 py-0.5 border border-border rounded">
                          {LANG_FLAG[t.language]}
                        </span>
                      </div>
                      <div className="text-[11px] tabular text-muted-foreground">
                        {t.usage30d.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT: Editor + preview + rail */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-12 gap-4">
          {/* Editor */}
          <div className="col-span-12 xl:col-span-7 space-y-3">
            {/* Title bar */}
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    value={selected.name}
                    onChange={(e) => updateSelected({ name: e.target.value })}
                    className="h-9 font-mono text-sm font-medium"
                  />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
                    <Select
                      value={selected.category}
                      onChange={(e) => updateSelected({ category: e.target.value as Category })}
                      className="h-7 text-xs w-auto"
                    >
                      <option value="Booking">Booking</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Utility">Utility</option>
                    </Select>
                    <Select
                      value={selected.language}
                      onChange={(e) => updateSelected({ language: e.target.value as Language })}
                      className="h-7 text-xs w-auto"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Marathi">Marathi</option>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => showToast(`Share link copied: pearlmarina.com/t/${selected.name}`)} title="Copy share link">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => showToast(`Opening pearlmarina.com/t/${selected.name} in new tab`)} title="Open public link">
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => showToast("Template duplicated")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => showToast("Template deleted")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Header section */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Header</Label>
                  <span className="text-[10px] text-muted-foreground">Optional · max 60 chars</span>
                </div>
                <span className="text-[10px] tabular text-muted-foreground">
                  {(selected.header || "").length}/60
                </span>
              </div>
              <Input
                value={selected.header || ""}
                onChange={(e) => updateSelected({ header: e.target.value.slice(0, 60) })}
                placeholder="e.g. Booking Confirmed at The Pearl Marina"
                className="h-9"
                maxLength={60}
              />
            </Card>

            {/* Body */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Body</Label>
                  <span className="text-[10px] text-muted-foreground">Required · max 1024 chars</span>
                </div>
                <span className="text-[10px] tabular text-muted-foreground">{selected.body.length}/1024</span>
              </div>
              <textarea
                value={selected.body}
                onChange={(e) => updateSelected({ body: e.target.value })}
                rows={5}
                maxLength={1024}
                className={cn(
                  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden resize-none",
                  "placeholder:text-subtle-foreground",
                  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                )}
              />
              {/* Highlighted preview of body */}
              <div className="mt-2 text-xs text-muted-foreground p-2 rounded bg-surface-sunken/40 border border-border/60">
                <span className="font-medium text-[10px] uppercase tracking-wider mr-2">Preview:</span>
                {renderBodyHighlighted(selected.body)}
              </div>

              {/* Variable picker */}
              <div className="mt-3">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Insert Variable
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {VARIABLE_CHIPS.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-surface hover:bg-accent-soft hover:border-accent/40 transition-colors text-xs"
                    >
                      <Sparkles className="h-3 w-3 text-accent" />
                      <span className="font-mono">{`{{${v.key}}}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Footer */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Footer</Label>
                  <span className="text-[10px] text-muted-foreground">Optional · max 60 chars</span>
                </div>
                <span className="text-[10px] tabular text-muted-foreground">
                  {(selected.footer || "").length}/60
                </span>
              </div>
              <Input
                value={selected.footer || ""}
                onChange={(e) => updateSelected({ footer: e.target.value.slice(0, 60) })}
                placeholder="e.g. Reply STOP to opt out"
                className="h-9"
                maxLength={60}
              />
            </Card>

            {/* Buttons */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Buttons</Label>
                  <span className="text-[10px] text-muted-foreground">Max 3</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => addButton("Quick Reply")}>
                    <Plus className="h-3.5 w-3.5" />
                    Quick Reply
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addButton("URL")}>
                    <Plus className="h-3.5 w-3.5" />
                    URL
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addButton("Phone")}>
                    <Plus className="h-3.5 w-3.5" />
                    Phone
                  </Button>
                </div>
              </div>
              {selected.buttons.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-md">
                  No buttons yet · add up to 3
                </div>
              ) : (
                <div className="space-y-2">
                  {selected.buttons.map((b) => {
                    const Icon = b.type === "URL" ? LinkIcon : b.type === "Phone" ? Phone : MessageSquare;
                    return (
                      <div
                        key={b.id}
                        className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface-sunken/30"
                      >
                        <div className={cn(
                          "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                          b.type === "URL" && "bg-info-soft text-info",
                          b.type === "Phone" && "bg-success-soft text-success",
                          b.type === "Quick Reply" && "bg-accent-soft text-accent",
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <Badge tone="neutral" className="text-[10px] shrink-0">{b.type}</Badge>
                        <Input
                          value={b.text}
                          onChange={(e) => updateButton(b.id, { text: e.target.value })}
                          placeholder="Button text"
                          className="h-8 text-xs flex-1 min-w-0"
                        />
                        {b.type !== "Quick Reply" && (
                          <Input
                            value={b.value || ""}
                            onChange={(e) => updateButton(b.id, { value: e.target.value })}
                            placeholder={b.type === "URL" ? "https://..." : "+91..."}
                            className="h-8 text-xs flex-1 min-w-0 font-mono"
                          />
                        )}
                        <Button size="sm" variant="ghost" onClick={() => removeButton(b.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Save bar */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Edited {formatEdited(selected.lastEdited)} by {selected.editedBy}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => showToast("Changes discarded")}>
                  Discard
                </Button>
                <Button size="sm" onClick={saveSelected}>
                  <Save className="h-4 w-4" />
                  Save Draft
                </Button>
              </div>
            </div>
          </div>

          {/* Right: Preview + Rail */}
          <div className="col-span-12 xl:col-span-5 space-y-3">
            {/* Live preview - WhatsApp bubble */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Live Preview</Label>
                </div>
                <Badge tone="success" className="text-[10px]">WhatsApp</Badge>
              </div>

              {/* WhatsApp phone-style frame */}
              <div className="rounded-2xl overflow-hidden border border-border/80 bg-[#ECE5DD] shadow-inner">
                {/* WA Header */}
                <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold shrink-0">
                    PM
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight truncate">The Pearl Marina</div>
                    <div className="text-[10px] opacity-80 leading-tight">online · business</div>
                  </div>
                </div>

                {/* Chat area */}
                <div
                  className="px-3 py-4 min-h-[280px] relative"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)",
                    backgroundSize: "12px 12px",
                  }}
                >
                  {/* Message bubble */}
                  <div className="ml-auto max-w-[88%] bg-[#DCF8C6] rounded-lg px-2.5 py-2 shadow-sm relative">
                    {/* tail */}
                    <div className="absolute -right-1.5 top-0 w-0 h-0 border-l-[8px] border-l-[#DCF8C6] border-t-[8px] border-t-transparent" />

                    {previewHeader && (
                      <div className="text-[13px] font-semibold text-[#075E54] mb-1 leading-snug">
                        {previewHeader}
                      </div>
                    )}
                    <div className="text-[13px] text-[#303030] whitespace-pre-wrap leading-snug">
                      {previewBody}
                    </div>
                    {previewFooter && (
                      <div className="text-[11px] text-[#667781] mt-1.5 italic leading-snug">
                        {previewFooter}
                      </div>
                    )}

                    {/* Timestamp + ticks */}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-[#667781] tabular">12:42 PM</span>
                      <CheckCheck className="h-3.5 w-3.5 text-[#34B7F1]" />
                    </div>

                    {/* Buttons inside bubble — preview */}
                    {selected.buttons.length > 0 && (
                      <div className="mt-2 -mx-2.5 -mb-2 border-t border-black/10 pt-1.5">
                        {selected.buttons.map((b, i) => {
                          const Icon = b.type === "URL" ? LinkIcon : b.type === "Phone" ? Phone : MessageSquare;
                          return (
                            <div
                              key={b.id}
                              className={cn(
                                "px-2.5 py-2 flex items-center justify-center gap-1.5 text-[#075E54] text-[13px] font-medium",
                                i > 0 && "border-t border-black/10"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {b.text || "Button"}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                Preview uses sample values: <span className="font-mono">{sampleMap["1"] || "—"}</span>
                {sampleMap["2"] && <>, <span className="font-mono">{sampleMap["2"]}</span></>}…
              </p>
            </Card>

            {/* BSP Approval rail */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">BSP Approval</Label>
                <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
              </div>

              {selected.status === "Approved" && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-success-soft/60 border border-success/20">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <div className="text-xs text-success">
                    Approved by Meta on {selected.submittedOn ? new Date(selected.submittedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}. Template is live and can be used to send messages.
                  </div>
                </div>
              )}

              {selected.status === "Pending" && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning-soft/60 border border-warning/20">
                  <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-warning">
                    Submitted on {selected.submittedOn ? new Date(selected.submittedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}. Meta typically reviews within 24 hours.
                  </div>
                </div>
              )}

              {selected.status === "Rejected" && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-danger-soft/60 border border-danger/20">
                  <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                  <div className="text-xs text-danger">
                    <div className="font-medium mb-0.5">Rejection reason</div>
                    <div>{selected.rejectionReason || "No reason provided"}</div>
                  </div>
                </div>
              )}

              <Button
                size="sm"
                onClick={() =>
                  showToast(
                    selected.status === "Approved"
                      ? "Already approved · re-submit not needed"
                      : "Submitted to Meta for approval"
                  )
                }
                className="w-full"
              >
                <Send className="h-4 w-4" />
                {selected.status === "Rejected" ? "Re-submit for Approval" : "Submit for Approval"}
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Last Edited
                  </div>
                  <div className="text-xs mt-0.5">{formatEdited(selected.lastEdited)}</div>
                  <div className="text-[10px] text-muted-foreground">by {selected.editedBy}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Usage · 30d
                  </div>
                  <div className="text-xs mt-0.5 tabular font-semibold">
                    {selected.usage30d.toLocaleString("en-IN")} sent
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selected.usage30d > 0 ? "98.4% delivered" : "Not in use"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Test message */}
            <Card className="p-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Send className="h-3.5 w-3.5" />
                Send Test Message
              </Label>
              <div className="flex items-center gap-2">
                <PhoneInput
                  value={testPhone}
                  onChange={(v) => setTestPhone(v)}
                  invalid={testPhone !== "" && !isValidPhone(testPhone)}
                  size="sm"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isValidPhone(testPhone)}
                  onClick={() => {
                    if (selected.status !== "Approved") {
                      showToast("Template must be approved to send");
                      return;
                    }
                    showToast(`Test message sent to ${testPhone.trim()}`);
                  }}
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Sample values will be substituted. WhatsApp Business charges apply per message (₹0.48 / utility, ₹0.78 / marketing).
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
