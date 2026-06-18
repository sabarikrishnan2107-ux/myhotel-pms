"use client";
import * as React from "react";
import Link from "next/link";
import {
  Bot, Send, Sparkles, BedDouble, CheckCircle2, TrendingUp, MessageSquareText,
  Mic, Copy, Share2, Settings, History, Plus, Trash2, X, Shield, Zap, Languages,
  ArrowRight, Lightbulb, FileText, Wallet, Crown, Eye, RefreshCw, Pencil,
  AlertTriangle, Star, Brain, Phone, MessageCircle, PhoneIncoming, Volume2,
  ChevronRight, ThumbsUp, ThumbsDown, MapPin, IndianRupee,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, money } from "@/lib/utils";

// ============= TYPES =============
type Intent = "booking" | "guest_lookup" | "pricing" | "reply_draft" | "audit_summary" | "inventory" | "report" | "general";

type ActionCard = {
  kind: "booking" | "pricing" | "reply" | "guest" | "audit" | "inventory";
  title: string;
  data?: Record<string, string>;
  reply?: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  card?: ActionCard;
  hint?: string;
};

// ============= SEED PROMPTS / CONVERSATIONS / INSIGHTS =============
const SAMPLE_PROMPTS = [
  { icon: BedDouble, text: "Book 3 deluxe rooms from 25 May to 28 May for ABC Travels, 6 adults, breakfast included." },
  { icon: Crown,     text: "Show me Anjali Iyer's last 3 stays." },
  { icon: TrendingUp,text: "Suggest pricing for next weekend — Friday to Sunday." },
  { icon: MessageSquareText, text: "Draft a polite WhatsApp reply for the AC complaint in room 305." },
  { icon: FileText,  text: "Summarize last night's audit." },
  { icon: Wallet,    text: "Predict inventory order for next week." },
];

const SAVED_CONVERSATIONS = [
  { id: "c1", title: "Group block — TechCorp Aug 2026", at: "Today · 11:24", preview: "Quoted ₹3.6L for 30 rooms × 3N…" },
  { id: "c2", title: "Pricing for Ganesh Chaturthi week", at: "Yesterday", preview: "Recommended +18% above baseline ADR…" },
  { id: "c3", title: "Reply draft — late checkout request", at: "Yesterday", preview: "Polite refusal citing housekeeping turnover…" },
  { id: "c4", title: "Weekly inventory forecast", at: "2 days ago", preview: "Linen, toiletries, F&B perishables for week 22" },
];

const DAILY_INSIGHTS = [
  { icon: TrendingUp, tone: "success", title: "Occupancy +5pp vs last week", detail: "Driven by corporate weekday surge (TechCorp + Emirates Bank)" },
  { icon: Lightbulb,  tone: "warning", title: "Room 305 AC repeat complaint", detail: "3rd ticket in 14 days · suggest deeper service or replace unit" },
  { icon: Wallet,     tone: "info",    title: "₹70k receivables aged 60+ days", detail: "Skyline Tours · TechCorp · auto-reminder scheduled for tomorrow" },
];

// ============= INTENT DETECTION =============
function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/book\b|booking\b|reserve\b|reservation\b/.test(t)) return "booking";
  if (/last\s+\d+\s+stay|history|guest\s+(record|profile)|find\b.*\b(guest|customer)/.test(t)) return "guest_lookup";
  if (/pric(ing|e)\b|rate\b|adr\b|weekend\b/.test(t)) return "pricing";
  if (/draft\b|reply\b|message\b|whatsapp\b|email\b|complain/.test(t)) return "reply_draft";
  if (/audit\b|night\s+audit|summary\b/.test(t)) return "audit_summary";
  if (/inventory\b|stock\b|order\b/.test(t)) return "inventory";
  if (/report\b|adr\b|revpar\b|occupancy\b/.test(t)) return "report";
  return "general";
}

// Generate assistant text + optional action card from user intent
function generateResponse(text: string): { reply: string; card?: ActionCard; hint?: string } {
  const intent = detectIntent(text);
  switch (intent) {
    case "booking": {
      const total = 6517;
      return {
        reply: "I've prepared a booking for **ABC Travels** — 3 Deluxe rooms, 25–28 May (3 nights), 6 adults, CP rate plan (Room + Breakfast). Total **" + money(total * 100) + "** with their corporate discount applied.",
        card: {
          kind: "booking",
          title: "Suggested booking",
          data: { Agent: "ABC Travels", Rooms: "3 × Deluxe", Dates: "25 → 28 May", Total: money(total * 100) },
        },
        hint: "Rooms suggested: 204, 305, 408 — all adjacent to elevator",
      };
    }
    case "guest_lookup": {
      return {
        reply: "Found 3 stays for **Anjali Iyer** (VIP · Platinum). Last visit: 18 May 2026 in Suite 1201. Total lifetime spend: ₹4,82,000 across 12 nights.",
        card: { kind: "guest", title: "Recent stays", data: { Visits: "12 nights", "Last stay": "18 May 2026", Lifetime: money(482000), Tier: "Platinum" } },
        hint: "Opening guest profile would show all bookings and preferences.",
      };
    }
    case "pricing": {
      return {
        reply: "For next weekend (Fri 30 May → Sun 1 Jun) I recommend pushing **Deluxe** from ₹8,200 to ₹9,400 (+15%). Pace is 67% sold already with strong corporate demand carry-over. Suite occupancy still 38% — hold at base.",
        card: { kind: "pricing", title: "Suggested rate change", data: { "Room type": "Deluxe", "Current ADR": money(8200), "New ADR": money(9400), "Δ": "+15%", "Pace": "67% sold" } },
        hint: "Channel manager will sync to OTAs in 2 minutes after approval.",
      };
    }
    case "reply_draft": {
      return {
        reply: "Here's a polite WhatsApp reply for the Room 305 AC complaint:",
        card: {
          kind: "reply", title: "Draft message",
          reply: "Dear Mr. Patel,\n\nThank you for bringing this to our attention. We've dispatched our maintenance team to inspect the AC unit in Room 305 — they should arrive within 15 minutes.\n\nWe sincerely apologise for the inconvenience and have placed an extra cooling fan in your room as a temporary comfort. A complimentary fruit basket and beverages will be delivered shortly.\n\nIs there anything else I can do to make your stay more pleasant?\n\nWarm regards,\nReception · The Pearl Marina",
        },
        hint: "Tone tuned to: empathetic · solution-first · brand voice.",
      };
    }
    case "audit_summary": {
      return {
        reply: "Last night's audit (**24 May 2026**) closed successfully in 47s. **Occupancy 40%**, revenue **₹84,520**, 0 no-shows. All payments reconciled. Cash variance: ₹0. GST e-Invoice IRNs filed for 12 invoices. Books locked.",
        card: { kind: "audit", title: "Manager Flash · 24 May", data: { Occupancy: "40%", Revenue: money(84520), ADR: money(8450), RevPAR: money(3380), "No-shows": "0" } },
        hint: "Detailed report available under Night Audit → Audit history.",
      };
    }
    case "inventory": {
      return {
        reply: "Forecast for **week 22** based on 14-day occupancy trend and tonight's roster: order **240 bath linens**, **180 face towels**, **45 amenity kits**, F&B perishables for ~620 covers. Lead time: 48h.",
        card: { kind: "inventory", title: "Inventory order draft", data: { "Linen": "240 units", "Face towels": "180 units", "Amenity kits": "45 sets", "F&B covers": "~620" } },
        hint: "Vendor: ABC Linens (PO will be auto-generated on approval).",
      };
    }
    default:
      return {
        reply: "I can help with bookings, pricing decisions, guest lookups, reply drafts, audit summaries, inventory forecasts, and report queries. Try one of the suggested prompts below or ask me anything about your hotel.",
      };
  }
}

// ============= MAIN COMPONENT =============
type AITab = "chat" | "predictions" | "reviews" | "anomalies" | "voice";

export default function AIAssistantPage() {
  const [tab, setTab] = React.useState<AITab>("chat");
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "m0", role: "assistant", at: "Just now",
      text: "Hi Khalid — I'm your AI hotel assistant. Ask me about bookings, pricing, guest history, or just chat through a guest reply. Suggested prompts below.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, working]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || working) return;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = { id: `m-${Date.now()}-u`, role: "user", text: trimmed, at: now };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setWorking(true);
    setTimeout(() => {
      const { reply, card, hint } = generateResponse(trimmed);
      const aiMsg: Message = { id: `m-${Date.now()}-a`, role: "assistant", text: reply, at: now, card, hint };
      setMessages(prev => [...prev, aiMsg]);
      setWorking(false);
    }, 900);
  };

  const handleAction = (action: "confirm" | "edit" | "discard", card: ActionCard) => {
    const responses: Record<typeof action, string> = {
      confirm: `Confirmed: ${card.title.toLowerCase()} — committed to the system. You'll see it in the relevant module.`,
      edit:    `Opening editor for: ${card.title.toLowerCase()} — adjust fields then save.`,
      discard: `Discarded: ${card.title.toLowerCase()} — no changes made.`,
    };
    showToast(responses[action]);
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, {
      id: `m-${Date.now()}-sys`, role: "assistant", at: now,
      text: action === "confirm" ? "Done. The action has been applied and logged. Is there anything else I can help with?" :
            action === "edit" ? "Opening editor — you can adjust details and re-confirm." :
            "Got it. Discarded with no changes. Let me know if you want a different approach.",
    }]);
  };

  const clearConversation = () => {
    setMessages([{ id: "m-new", role: "assistant", at: "Just now", text: "Conversation cleared. How can I help?" }]);
    showToast("Conversation cleared");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* SIDEBAR */}
        <aside className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <span className="h-10 w-10 rounded-md bg-brand text-brand-foreground inline-flex items-center justify-center shadow-md shrink-0">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display font-medium text-lg leading-tight">AI Assistant</h1>
              <p className="text-[10px] text-muted-foreground">Claude · hotel-trained</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1.5">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={clearConversation}>
              <Plus className="h-3.5 w-3.5" />New conversation
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setShowHistory(true)}>
              <History className="h-3.5 w-3.5" />Conversation history
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setShowSettings(true)}>
              <Settings className="h-3.5 w-3.5" />Settings
            </Button>
          </div>

          {/* Insights */}
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><Lightbulb className="h-3 w-3" />Today&apos;s insights</p>
            <ul className="space-y-2">
              {DAILY_INSIGHTS.map((ins, i) => {
                const Icon = ins.icon;
                return (
                  <li key={i} className={cn(
                    "rounded-md p-2 border text-xs",
                    ins.tone === "success" && "border-success/20 bg-success-soft/15",
                    ins.tone === "warning" && "border-warning/30 bg-warning-soft/20",
                    ins.tone === "info" && "border-info/20 bg-info-soft/15",
                  )}>
                    <p className="font-medium inline-flex items-start gap-1.5">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5",
                        ins.tone === "success" && "text-success",
                        ins.tone === "warning" && "text-warning",
                        ins.tone === "info" && "text-info",
                      )} />
                      <span>{ins.title}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 pl-5 leading-snug">{ins.detail}</p>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Capabilities */}
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Capabilities</p>
            <ul className="space-y-1.5 text-xs">
              {[
                { i: BedDouble, t: "Natural-language booking" },
                { i: TrendingUp, t: "Dynamic pricing & ADR" },
                { i: MessageSquareText, t: "Reply drafting · 4 languages" },
                { i: FileText, t: "Audit summaries · reports" },
                { i: Wallet, t: "Inventory forecasts" },
                { i: Crown, t: "Guest profile lookups" },
              ].map((c, i) => {
                const Icon = c.i;
                return (
                  <li key={i} className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-brand shrink-0" />{c.t}</li>
                );
              })}
            </ul>
          </Card>
        </aside>

        {/* MAIN */}
        <div className="space-y-4 min-w-0">
          {/* Sub-tab nav */}
          <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
            {([
              { id: "chat",        label: "Chat",        icon: MessageSquareText },
              { id: "predictions", label: "Predictions", icon: Brain },
              { id: "reviews",     label: "Reviews",     icon: Star },
              { id: "anomalies",   label: "Anomalies",   icon: AlertTriangle },
              { id: "voice",       label: "Voice booking", icon: PhoneIncoming },
            ] as const).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id as AITab)} className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2",
                  tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className="h-3.5 w-3.5" />{t.label}
                </button>
              );
            })}
          </div>

          {tab !== "chat" && (
            <>
              {tab === "predictions" && <PredictionsTab onToast={showToast} />}
              {tab === "reviews" && <ReviewsTab onToast={showToast} />}
              {tab === "anomalies" && <AnomaliesTab onToast={showToast} />}
              {tab === "voice" && <VoiceTab onToast={showToast} />}
            </>
          )}

          {tab === "chat" && (<>
          {/* Chat area */}
          <Card className="p-0 flex flex-col h-[640px] overflow-hidden">
            {/* Topbar */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface-elevated">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-3.5 w-3.5 text-brand shrink-0" />
                <p className="text-sm font-medium truncate">Live conversation</p>
                <Badge tone="success" className="ml-1"><span className="h-1.5 w-1.5 rounded-full bg-success inline-block animate-pulse" />Online</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { showToast("Conversation link copied"); navigator.clipboard?.writeText(window.location.href); }} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Share">
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={clearConversation} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Clear">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5 bg-linear-to-b from-surface to-surface-sunken/20">
              {messages.map(m => m.role === "user" ? (
                <UserMessage key={m.id} text={m.text} at={m.at} />
              ) : (
                <AssistantMessage key={m.id} message={m} onAction={handleAction} onCopy={(t) => { navigator.clipboard?.writeText(t); showToast("Copied to clipboard"); }} />
              ))}
              {working && (
                <div className="flex gap-2.5">
                  <span className="h-8 w-8 rounded-full bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-surface-sunken px-4 py-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 bg-surface">
              <form className="flex gap-2" onSubmit={e => { e.preventDefault(); send(input); }}>
                <button type="button" onClick={() => showToast("Voice input coming soon")} className="h-11 w-11 rounded-md border border-border hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground transition-colors" title="Voice">
                  <Mic className="h-4 w-4" />
                </button>
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask anything — book a room, check pricing, draft a reply…"
                    className="h-11 pr-12"
                    autoFocus
                    disabled={working}
                  />
                  {input && (
                    <button type="button" onClick={() => setInput("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Button size="lg" type="submit" disabled={!input.trim() || working}>
                  {working ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />Send</>}
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-2 px-1 inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                AI never executes destructive actions · all suggestions logged in audit log · responses are mocked in this demo
              </p>
            </div>
          </Card>

          {/* Suggested prompts */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 inline-flex items-center gap-1.5">
              <Zap className="h-3 w-3" />Try saying
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SAMPLE_PROMPTS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.text}
                    onClick={() => send(p.text)}
                    disabled={working}
                    className="text-left p-3 rounded-md border border-border hover:bg-brand-soft/20 hover:border-brand/30 transition-colors text-sm inline-flex items-start gap-2.5 disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                    <span className="text-muted-foreground italic">&ldquo;{p.text}&rdquo;</span>
                  </button>
                );
              })}
            </div>
          </div>
          </>)}
        </div>
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSave={() => { setShowSettings(false); showToast("AI preferences saved"); }} />}
      {showHistory && <HistoryDrawer onClose={() => setShowHistory(false)} onOpen={(c) => { setShowHistory(false); showToast(`Opened: ${c.title}`); }} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background rounded-lg px-4 py-3 text-sm shadow-2xl animate-in slide-in-from-bottom-2 inline-flex items-center gap-2.5 ring-1 ring-foreground/20">
          <span className="h-6 w-6 rounded-full bg-success text-white inline-flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ============= MESSAGE COMPONENTS =============
function UserMessage({ text, at }: { text: string; at: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-md">
        <div className="rounded-2xl rounded-tr-sm bg-brand text-brand-foreground px-4 py-2.5">
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
        <p className="text-[10px] text-muted-foreground tabular text-right mt-1 pr-2">{at}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ message, onAction, onCopy }: {
  message: Message;
  onAction: (a: "confirm" | "edit" | "discard", card: ActionCard) => void;
  onCopy: (text: string) => void;
}) {
  // Simple bold markdown rendering: **text** → <strong>
  const formatted = message.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );

  return (
    <div className="flex gap-2.5 group">
      <span className="h-8 w-8 rounded-full bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex-1 space-y-3 min-w-0">
        <div className="rounded-2xl rounded-tl-sm bg-surface-sunken px-4 py-3">
          <p className="text-sm leading-relaxed">{formatted}</p>
        </div>

        {message.card && <ActionCardView card={message.card} onAction={onAction} onCopy={onCopy} />}

        {message.hint && (
          <p className="text-xs text-muted-foreground inline-flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{message.hint}</span>
          </p>
        )}

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-muted-foreground tabular">{message.at}</p>
          <button type="button" onClick={() => onCopy(message.text)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Copy className="h-2.5 w-2.5" />Copy
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionCardView({ card, onAction, onCopy }: {
  card: ActionCard;
  onAction: (a: "confirm" | "edit" | "discard", card: ActionCard) => void;
  onCopy: (text: string) => void;
}) {
  return (
    <Card className="border-brand/30 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-xs uppercase tracking-wider font-semibold text-brand">{card.title}</span>
        </div>

        {card.data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
            {Object.entries(card.data).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="font-medium tabular">{v}</p>
              </div>
            ))}
          </div>
        )}

        {card.reply && (
          <div className="rounded-md border border-border bg-surface-sunken/30 p-3 mb-3 text-sm whitespace-pre-wrap leading-relaxed">
            {card.reply}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {card.kind === "reply" ? (
            <>
              <Button size="sm" variant="success" onClick={() => { onCopy(card.reply || ""); onAction("confirm", card); }}>
                <Copy className="h-3.5 w-3.5" />Copy &amp; send
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction("edit", card)}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="success" onClick={() => onAction("confirm", card)}>
                <CheckCircle2 className="h-3.5 w-3.5" />Confirm &amp; create
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction("edit", card)}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => onAction("discard", card)}>
            Discard
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============= SETTINGS MODAL =============
function SettingsModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [model, setModel] = React.useState("Claude Sonnet 4.5");
  const [temperature, setTemperature] = React.useState(0.5);
  const [language, setLanguage] = React.useState("English");
  const [logQueries, setLogQueries] = React.useState(true);
  const [piiMask, setPiiMask] = React.useState(true);
  const [destructiveBlock, setDestructiveBlock] = React.useState(true);

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
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><Settings className="h-4 w-4" /></span>
            <h3 className="font-semibold">AI preferences</h3>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            <Select value={model} onChange={e => setModel(e.target.value)} className="h-9">
              <option>Claude Opus 4.7</option>
              <option>Claude Sonnet 4.5</option>
              <option>Claude Haiku 4.5</option>
            </Select>
            <p className="text-[10px] text-muted-foreground">Sonnet recommended for hotel operations · Opus for complex analysis</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Response temperature ({temperature.toFixed(1)})</Label>
            <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-current" />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular">
              <span>Precise (0.0)</span><span>Balanced</span><span>Creative (1.0)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs"><Languages className="h-3 w-3 inline mr-1" />Reply language</Label>
            <Select value={language} onChange={e => setLanguage(e.target.value)} className="h-9">
              <option>English</option>
              <option>Hindi</option>
              <option>Marathi</option>
              <option>Tamil</option>
              <option>Arabic</option>
            </Select>
          </div>

          <hr className="border-border" />
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Privacy &amp; safety</p>

          {[
            { label: "Log queries for audit trail", on: logQueries, set: setLogQueries, desc: "Required for compliance · cannot be turned off in production" },
            { label: "Mask PII in conversation logs", on: piiMask, set: setPiiMask, desc: "Auto-redact phone, email, ID numbers from history" },
            { label: "Block destructive actions", on: destructiveBlock, set: setDestructiveBlock, desc: "Cancel / refund / delete always require human confirmation" },
          ].map((opt, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              <Toggle on={opt.on} onChange={opt.set} />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}><CheckCircle2 className="h-3.5 w-3.5" />Save preferences</Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={cn(
      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
      on ? "bg-success justify-end" : "bg-zinc-300 dark:bg-zinc-600 justify-start"
    )}>
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}

// ============= HISTORY DRAWER =============
function HistoryDrawer({ onClose, onOpen }: {
  onClose: () => void;
  onOpen: (c: typeof SAVED_CONVERSATIONS[number]) => void;
}) {
  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground inline-flex items-center justify-center"><History className="h-4 w-4" /></span>
            <h3 className="font-semibold">Conversation history</h3>
          </div>
          <button type="button" onClick={onClose} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-2 overflow-y-auto flex-1">
          {SAVED_CONVERSATIONS.map(c => (
            <button key={c.id} onClick={() => onOpen(c)} className="w-full text-left p-3 rounded-md border border-border hover:border-brand hover:bg-brand-soft/15 transition-colors group">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">{c.title}</p>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground tabular mt-0.5">{c.at}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{c.preview}</p>
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border">
          <Link href="/audit-logs" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />View full audit log
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PREDICTIONS TAB
// ============================================================
type NoShowRisk = { id: string; bookingNo: string; guest: string; source: string; arrival: string; nights: number; total: number; paid: number; priorNoShows: number; risk: number; reasons: string[] };
type SpendPrediction = { id: string; bookingNo: string; guest: string; tier?: string; checkout: string; baseRevenue: number; predictedTotal: number; confidence: number; upsells: string[] };
type RoomSuggestion = { id: string; bookingNo: string; guest: string; arrival: string; nights: number; preferences: string[]; suggestion: { room: string; type: string; floor: number; matchScore: number; reasons: string[] }[] };

const NO_SHOW_SEED: NoShowRisk[] = [
  { id: "ns1", bookingNo: "BK100278", guest: "Akash Bhatt",     source: "Booking.com",    arrival: "Tomorrow 14:00", nights: 1, total: 4500,  paid: 0,    priorNoShows: 1, risk: 78, reasons: ["Unpaid OTA booking", "1 prior no-show", "Single night", "Arrival after 8 PM"] },
  { id: "ns2", bookingNo: "BK100281", guest: "Suresh Iyengar",  source: "Walk-in lead",   arrival: "Tomorrow 11:00", nights: 2, total: 9200,  paid: 0,    priorNoShows: 0, risk: 56, reasons: ["No advance received", "Last-minute booking"] },
  { id: "ns3", bookingNo: "BK100285", guest: "Mr. Lee Chang",   source: "Agoda",          arrival: "Tomorrow 16:00", nights: 3, total: 14800, paid: 5000, priorNoShows: 0, risk: 22, reasons: ["Partial advance paid", "Long stay window"] },
  { id: "ns4", bookingNo: "BK100290", guest: "Priya Krishnan",  source: "Direct",         arrival: "Tomorrow 12:00", nights: 1, total: 6500,  paid: 6500, priorNoShows: 0, risk: 8,  reasons: ["Paid in full", "Direct booking"] },
];

const SPEND_PREDICTIONS: SpendPrediction[] = [
  { id: "sp1", bookingNo: "BK100245", guest: "Anjali Iyer",      tier: "Platinum", checkout: "27 May", baseRevenue: 28500, predictedTotal: 42800, confidence: 87, upsells: ["Spa couples package (₹6,500)", "Anniversary dinner (₹3,200)", "Late checkout (₹500)"] },
  { id: "sp2", bookingNo: "BK100231", guest: "Sarah Whitfield",  tier: "Platinum", checkout: "26 May", baseRevenue: 34000, predictedTotal: 48600, confidence: 82, upsells: ["Spa massage (₹5,500)", "Airport transfer (₹1,800)", "Welcome dinner (₹2,800)"] },
  { id: "sp3", bookingNo: "BK100221", guest: "Karan Mehta",      tier: "Gold",     checkout: "26 May", baseRevenue: 18500, predictedTotal: 24800, confidence: 71, upsells: ["F&B package (₹3,500)", "Room upgrade (₹2,000)"] },
  { id: "sp4", bookingNo: "BK100252", guest: "Mr. Ahmed",        tier: "Gold",     checkout: "28 May", baseRevenue: 25200, predictedTotal: 34900, confidence: 76, upsells: ["Spa package (₹4,500)", "Halal dinner (₹2,200)", "City tour (₹2,500)"] },
];

const ROOM_SUGGESTIONS: RoomSuggestion[] = [
  { id: "rs1", bookingNo: "BK100278", guest: "Akash Bhatt", arrival: "Tomorrow", nights: 1, preferences: ["Quiet", "High floor"], suggestion: [
    { room: "412", type: "Deluxe", floor: 4, matchScore: 92, reasons: ["High floor (4)", "Away from elevator", "Recently cleaned"] },
    { room: "508", type: "Deluxe", floor: 5, matchScore: 88, reasons: ["High floor (5)", "Corner unit · quietest"] },
  ]},
  { id: "rs2", bookingNo: "BK100285", guest: "Mr. Lee Chang", arrival: "Tomorrow", nights: 3, preferences: ["Sea view", "Twin bed"], suggestion: [
    { room: "1201", type: "Suite", floor: 12, matchScore: 96, reasons: ["Sea view", "Twin bed config", "Long-stay rate"] },
    { room: "1108", type: "Suite", floor: 11, matchScore: 90, reasons: ["Sea view", "Available 3 nights"] },
  ]},
  { id: "rs3", bookingNo: "BK100290", guest: "Priya Krishnan", arrival: "Tomorrow", nights: 1, preferences: ["Near elevator", "Hypoallergenic pillow"], suggestion: [
    { room: "305", type: "Deluxe", floor: 3, matchScore: 94, reasons: ["Adjacent to elevator", "Hypo-pillow tagged", "Single night ideal"] },
  ]},
];

function PredictionsTab({ onToast }: { onToast: (m: string) => void }) {
  const [section, setSection] = React.useState<"noshow" | "spend" | "room">("noshow");
  const [acknowledged, setAcknowledged] = React.useState<Set<string>>(new Set());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "noshow", label: "No-show risk",         icon: AlertTriangle, count: NO_SHOW_SEED.length },
          { id: "spend",  label: "Guest-spend forecast", icon: TrendingUp,    count: SPEND_PREDICTIONS.length },
          { id: "room",   label: "Best-room AI",         icon: BedDouble,     count: ROOM_SUGGESTIONS.length },
        ] as const).map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSection(s.id as typeof section)} className={cn(
              "h-9 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
              section === s.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
            )}>
              <Icon className="h-3.5 w-3.5" />{s.label}
              <span className={cn("tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold", section === s.id ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground")}>{s.count}</span>
            </button>
          );
        })}
      </div>

      {/* No-show risk */}
      {section === "noshow" && (
        <div className="space-y-3">
          <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
            <Brain className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
            <p><strong>Model:</strong> Random forest on 24-month booking history · features = source, payment status, prior no-shows, nights, arrival time, lead time. <strong>Threshold:</strong> ≥60% risk → call guest + request advance</p>
          </Card>

          {NO_SHOW_SEED.map(r => {
            const acked = acknowledged.has(r.id);
            return (
              <Card key={r.id} className={cn("p-4", acked && "opacity-60", r.risk >= 60 && "border-l-4 border-l-danger")}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "h-14 w-14 rounded-md inline-flex items-center justify-center text-lg font-bold tabular shrink-0",
                      r.risk >= 60 ? "bg-danger text-white" : r.risk >= 30 ? "bg-warning text-white" : "bg-success text-white"
                    )}>{r.risk}%</div>
                    <div>
                      <p className="font-semibold">{r.guest} · {r.bookingNo}</p>
                      <p className="text-[11px] text-muted-foreground">{r.arrival} · {r.nights}N · {r.source} · {money(r.total)} total · {money(r.paid)} paid</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.reasons.map(re => <Badge key={re} tone="neutral">{re}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => onToast(`Call queued · ${r.guest}`)}>
                      <Phone className="h-3 w-3" />Call
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onToast(`Advance link sent to ${r.guest} via WhatsApp`)}>
                      <Send className="h-3 w-3" />Request advance
                    </Button>
                    <Button size="sm" variant={acked ? "ghost" : "primary"} onClick={() => { setAcknowledged(p => new Set([...p, r.id])); onToast("Acknowledged"); }} disabled={acked}>
                      {acked ? "Acknowledged" : "Mark seen"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Spend predictor */}
      {section === "spend" && (
        <div className="space-y-3">
          <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
            <Brain className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
            <p><strong>Model:</strong> Gradient-boosted regression on past stays · features = tier, source, room type, prior F&B + spa spend, stay length. <strong>Use:</strong> set upsell budget per guest, route to upsell team</p>
          </Card>

          {SPEND_PREDICTIONS.map(s => {
            const upliftPct = Math.round(((s.predictedTotal - s.baseRevenue) / s.baseRevenue) * 100);
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{s.guest}</p>
                      {s.tier && <Badge tone="brand">{s.tier}</Badge>}
                      <span className="text-[11px] text-muted-foreground tabular">{s.bookingNo} · ends {s.checkout}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Base (room only)</p>
                        <p className="text-base font-semibold tabular">{money(s.baseRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1"><IndianRupee className="h-2.5 w-2.5" />Predicted total</p>
                        <p className="text-base font-bold tabular text-success">{money(s.predictedTotal)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Uplift</p>
                        <p className="text-base font-bold tabular text-brand">+{upliftPct}%</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Recommended upsells</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.upsells.map(u => <Badge key={u} tone="accent">{u}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Confidence</p>
                    <p className={cn("text-3xl font-bold tabular", s.confidence >= 80 ? "text-success" : s.confidence >= 60 ? "text-warning" : "text-muted-foreground")}>{s.confidence}%</p>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 mt-3">
                  <Button size="sm" variant="outline" onClick={() => onToast(`Concierge briefed · upsell to ${s.guest}`)}><Sparkles className="h-3 w-3" />Brief concierge</Button>
                  <Button size="sm" onClick={() => onToast(`Upsell SMS scheduled for ${s.guest}`)}><Send className="h-3 w-3" />Send upsell offer</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Room AI */}
      {section === "room" && (
        <div className="space-y-3">
          <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
            <Brain className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
            <p><strong>Model:</strong> Preference-matching scorer · weighs guest preferences against room features, availability, HK status, distance from elevator/stairs. <strong>Use:</strong> auto-assign before arrival</p>
          </Card>

          {ROOM_SUGGESTIONS.map(rs => (
            <Card key={rs.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{rs.guest} · {rs.bookingNo}</p>
                  <p className="text-[11px] text-muted-foreground">Arrives {rs.arrival} · {rs.nights}N</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rs.preferences.map(p => <Badge key={p} tone="info">{p}</Badge>)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rs.suggestion.map((s, i) => (
                  <div key={i} className={cn("rounded-md border p-3", i === 0 && "border-brand bg-brand-soft/15")}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-brand" />Room {s.room}<span className="text-xs text-muted-foreground ml-2">{s.type} · Floor {s.floor}</span></p>
                      <Badge tone={i === 0 ? "brand" : "neutral"}>{s.matchScore}% match</Badge>
                    </div>
                    <ul className="mt-2 text-[11px] space-y-0.5">
                      {s.reasons.map(r => <li key={r} className="text-muted-foreground inline-flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-success" />{r}</li>)}
                    </ul>
                    {i === 0 && (
                      <Button size="sm" className="w-full mt-2" onClick={() => onToast(`Room ${s.room} assigned to ${rs.guest}`)}>Assign room {s.room}</Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// REVIEWS TAB
// ============================================================
type ReviewSentiment = "positive" | "neutral" | "negative";
type GuestReview = {
  id: string;
  source: "Google" | "TripAdvisor" | "Booking.com" | "MakeMyTrip";
  author: string;
  rating: number;
  date: string;
  text: string;
  sentiment: ReviewSentiment;
  topics: string[];
  draftReply: string;
};

const REVIEWS: GuestReview[] = [
  { id: "rv1", source: "Google",      author: "Anjali I.",     rating: 5, date: "2026-05-22", text: "Outstanding stay! The room was spotless, breakfast was excellent, and the concierge went out of his way to arrange a birthday surprise. Will definitely return.", sentiment: "positive", topics: ["Cleanliness", "Staff", "Breakfast"], draftReply: "Dear Anjali, thank you so much for your kind words! It was our pleasure to celebrate your birthday with you. We're thrilled to hear you enjoyed every aspect of your stay — our team will be delighted to read this. We look forward to welcoming you back soon!\n\nWarm regards,\nThe Pearl Marina" },
  { id: "rv2", source: "TripAdvisor", author: "James W.",       rating: 4, date: "2026-05-20", text: "Beautiful property and great location. The room was nice and the bed comfortable. Only feedback — Wi-Fi was a bit patchy in the rooms on the higher floors.", sentiment: "positive", topics: ["Location", "Wi-Fi", "Room"], draftReply: "Dear James, thank you for the lovely feedback! We're glad to hear you enjoyed the property and the room. We appreciate you flagging the Wi-Fi issue on the higher floors — our IT team is upgrading access points next week. We hope to welcome you again soon!\n\nBest regards,\nThe Pearl Marina" },
  { id: "rv3", source: "Booking.com", author: "Priya K.",       rating: 2, date: "2026-05-18", text: "Disappointed. The AC in room 305 wasn't working when we arrived and it took 2 hours to fix. The room service was slow. Expected better at this price point.", sentiment: "negative", topics: ["AC", "Maintenance", "Room service", "Value"], draftReply: "Dear Priya, we are truly sorry for the inconvenience caused by the AC issue in room 305 and the slow service. This falls short of our standards. We've already raised a maintenance ticket to fully overhaul that unit and added the room service to our internal review. As a gesture of apology, please accept a complimentary night certificate which will arrive via WhatsApp shortly. We sincerely hope you will give us another chance.\n\nApologies,\nThe Pearl Marina" },
  { id: "rv4", source: "Google",      author: "Karan M.",       rating: 5, date: "2026-05-15", text: "The anniversary package was thoughtful — cake, flowers, and a private dinner setup. Our suite had a beautiful sea view. Truly special memories made.", sentiment: "positive", topics: ["Anniversary", "Suite", "Sea view", "F&B"], draftReply: "Dear Karan, thank you for choosing The Pearl Marina for such a special occasion! We're so happy your anniversary was memorable. Our team takes great pride in personalising every guest experience. Wishing you many more happy anniversaries — see you next year!\n\nWarmly,\nThe Pearl Marina" },
  { id: "rv5", source: "MakeMyTrip",  author: "Rohan J.",       rating: 3, date: "2026-05-12", text: "Average experience. Room was clean but the check-in took 25 minutes. Breakfast was OK but limited vegetarian options. Bar was good.", sentiment: "neutral", topics: ["Check-in speed", "Breakfast", "Vegetarian", "Bar"], draftReply: "Dear Rohan, thank you for the honest feedback. We're sorry the check-in was slow — we're adding a second reception during peak hours starting June. We've also briefed our F&B team to expand the vegetarian breakfast selection. We're glad you enjoyed the bar!\n\nKind regards,\nThe Pearl Marina" },
];

function ReviewsTab({ onToast }: { onToast: (m: string) => void }) {
  const [filter, setFilter] = React.useState<"all" | ReviewSentiment>("all");
  const [expandedReply, setExpandedReply] = React.useState<string | null>(REVIEWS[0].id);

  const filtered = REVIEWS.filter(r => filter === "all" || r.sentiment === filter);
  const positives = REVIEWS.filter(r => r.sentiment === "positive").length;
  const negatives = REVIEWS.filter(r => r.sentiment === "negative").length;
  const neutrals = REVIEWS.filter(r => r.sentiment === "neutral").length;
  const avgRating = (REVIEWS.reduce((t, r) => t + r.rating, 0) / REVIEWS.length).toFixed(1);

  // Topic frequency
  const topicCount = REVIEWS.flatMap(r => r.topics).reduce<Record<string, number>>((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const trendingTopics = Object.entries(topicCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Sentiment overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Avg rating</p>
          <p className="text-3xl font-bold tabular mt-1 inline-flex items-center gap-1">{avgRating}<Star className="h-5 w-5 text-warning fill-current" /></p>
          <p className="text-[10px] text-muted-foreground">{REVIEWS.length} reviews</p>
        </Card>
        <Card className="p-3 text-center bg-success-soft/30 border-success/20">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-success">Positive</p>
          <p className="text-3xl font-bold tabular mt-1 text-success">{positives}</p>
          <p className="text-[10px] text-muted-foreground">{Math.round(positives / REVIEWS.length * 100)}% of total</p>
        </Card>
        <Card className="p-3 text-center bg-warning-soft/30 border-warning/20">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-warning">Neutral</p>
          <p className="text-3xl font-bold tabular mt-1 text-warning">{neutrals}</p>
          <p className="text-[10px] text-muted-foreground">{Math.round(neutrals / REVIEWS.length * 100)}%</p>
        </Card>
        <Card className="p-3 text-center bg-danger-soft/30 border-danger/20">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-danger">Negative</p>
          <p className="text-3xl font-bold tabular mt-1 text-danger">{negatives}</p>
          <p className="text-[10px] text-muted-foreground">{Math.round(negatives / REVIEWS.length * 100)}%</p>
        </Card>
      </div>

      {/* Trending topics */}
      <Card className="p-3">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />Trending topics (extracted via NLP)</p>
        <div className="flex flex-wrap gap-1.5">
          {trendingTopics.map(([topic, count]) => (
            <Badge key={topic} tone="brand">{topic} · {count}</Badge>
          ))}
        </div>
      </Card>

      {/* Sentiment filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "positive", "neutral", "negative"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
            filter === f ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>{f}</button>
        ))}
      </div>

      {/* Reviews */}
      <div className="space-y-3">
        {filtered.map(r => (
          <Card key={r.id} className={cn(
            "p-4",
            r.sentiment === "positive" && "border-l-4 border-l-success",
            r.sentiment === "neutral" && "border-l-4 border-l-warning",
            r.sentiment === "negative" && "border-l-4 border-l-danger",
          )}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{r.author}</p>
                  <Badge tone="neutral">{r.source}</Badge>
                  <Badge tone={r.sentiment === "positive" ? "success" : r.sentiment === "neutral" ? "warning" : "danger"}>{r.sentiment}</Badge>
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn("h-3 w-3", i < r.rating ? "text-warning fill-current" : "text-muted-foreground/30")} />
                    ))}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground tabular mt-0.5">{r.date}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onToast("Marked helpful")} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Mark helpful"><ThumbsUp className="h-3 w-3" /></button>
                <button onClick={() => onToast("Marked unhelpful")} className="h-7 w-7 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground" title="Mark unhelpful"><ThumbsDown className="h-3 w-3" /></button>
              </div>
            </div>
            <p className="text-sm leading-relaxed">&ldquo;{r.text}&rdquo;</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {r.topics.map(t => <Badge key={t} tone="neutral">{t}</Badge>)}
            </div>

            {/* AI-drafted reply */}
            <div className="mt-3 pt-3 border-t border-border">
              <button onClick={() => setExpandedReply(expandedReply === r.id ? null : r.id)} className="text-xs font-semibold text-brand inline-flex items-center gap-1.5 hover:underline">
                <Sparkles className="h-3 w-3" />AI-drafted reply
                <ChevronRight className={cn("h-3 w-3 transition-transform", expandedReply === r.id && "rotate-90")} />
              </button>
              {expandedReply === r.id && (
                <div className="mt-2 p-3 rounded-md bg-surface-sunken/40 border border-border">
                  <textarea readOnly value={r.draftReply} rows={6} className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none" />
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground italic">Tone: {r.sentiment === "negative" ? "Apologetic + solution-first" : r.sentiment === "neutral" ? "Acknowledging + improving" : "Warm + grateful"}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(r.draftReply); onToast("Reply copied"); }}><Copy className="h-3 w-3" />Copy</Button>
                      <Button size="sm" variant="outline" onClick={() => onToast("Reply opened for editing")}><Pencil className="h-3 w-3" />Edit</Button>
                      <Button size="sm" onClick={() => onToast(`Reply posted to ${r.source}`)}><Send className="h-3 w-3" />Post to {r.source}</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ANOMALIES TAB
// ============================================================
type AnomalyType = "discount" | "refund" | "comp" | "cash_variance" | "access" | "rate";
type AnomalySeverity = "low" | "medium" | "high" | "critical";
type Anomaly = { id: string; type: AnomalyType; severity: AnomalySeverity; title: string; description: string; detectedAt: string; evidence: string; actor: string; suggestion: string; status: "new" | "investigating" | "dismissed" };

const ANOMALIES_SEED: Anomaly[] = [
  { id: "an1", type: "discount", severity: "high",     title: "Unusual discount pattern",       description: "Khalid R. applied 25%+ discount to 4 bookings this week (vs. 1.2 avg/week baseline)", detectedAt: "Today 14:18", evidence: "BK100245 (30%), BK100231 (25%), BK100221 (28%), BK100199 (25%)", actor: "Khalid R.", suggestion: "Review with shift manager · check if all required approvals exist", status: "new" },
  { id: "an2", type: "refund",   severity: "critical", title: "Refund cluster — same payment method", description: "3 refunds totalling ₹38,500 issued in 90 minutes to UPI VPA different from booking VPA", detectedAt: "Today 11:42", evidence: "RF-2026-220, RF-2026-221, RF-2026-222 all to upi-id-X", actor: "Front Office", suggestion: "Freeze refunds via this VPA · escalate to compliance · check for collusion", status: "investigating" },
  { id: "an3", type: "cash_variance", severity: "medium", title: "Cash variance trend",          description: "Shift #4221 (Priya M.) closed with -₹500 variance · 3rd negative variance in 30 days", detectedAt: "Today 23:50", evidence: "Shifts #4189 (-₹300), #4205 (-₹450), #4221 (-₹500)", actor: "Priya M.", suggestion: "1-on-1 with cashier · review float count procedure", status: "new" },
  { id: "an4", type: "comp",     severity: "medium", title: "Comp spike",                       description: "Complimentary upgrades up 240% week-over-week (12 vs avg 5)", detectedAt: "Today 09:00", evidence: "All 12 comps approved by Manager Tom W. · 4 to same agent group", actor: "Tom W. (Mgr)", suggestion: "Check if linked to a campaign or relationship · re-confirm comp policy", status: "new" },
  { id: "an5", type: "access",   severity: "high",     title: "Off-hours admin access",          description: "Settings page accessed at 03:14 AM from IP 103.244.x.x (outside India IP)", detectedAt: "Today 03:14", evidence: "Login: admin@thepearl.in · IP not in whitelist · 5 prior failed attempts", actor: "admin user", suggestion: "Reset admin password · enforce IP whitelist · audit recent setting changes", status: "investigating" },
  { id: "an6", type: "rate",     severity: "low",      title: "Rate parity drift",                description: "Deluxe room sold at ₹6,500 via direct booking vs ₹7,200 on Booking.com (parity gap)", detectedAt: "Yesterday", evidence: "9 direct bookings under OTA rate this week", actor: "Channel Manager", suggestion: "Sync rates · review channel manager push logs", status: "new" },
];

function AnomaliesTab({ onToast }: { onToast: (m: string) => void }) {
  const [anomalies, setAnomalies] = React.useState<Anomaly[]>(ANOMALIES_SEED);
  const [severityFilter, setSeverityFilter] = React.useState<"all" | AnomalySeverity>("all");

  const filtered = anomalies.filter(a => a.status !== "dismissed" && (severityFilter === "all" || a.severity === severityFilter));
  const critical = anomalies.filter(a => a.severity === "critical" && a.status !== "dismissed").length;
  const high = anomalies.filter(a => a.severity === "high" && a.status !== "dismissed").length;

  const SEVERITY_TONE: Record<AnomalySeverity, "neutral" | "warning" | "danger" | "info"> = {
    low: "info", medium: "warning", high: "danger", critical: "danger",
  };
  const TYPE_ICON: Record<AnomalyType, typeof TrendingUp> = {
    discount: TrendingUp, refund: RefreshCw, comp: Sparkles, cash_variance: Wallet, access: Shield, rate: TrendingUp,
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {(critical > 0 || high > 0) && (
        <Card className="p-3 bg-danger-soft/15 border-danger/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{critical + high} high-priority anomalies detected</p>
              <p className="text-[11px] text-muted-foreground">{critical} critical · {high} high · review before end of shift</p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Brain className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p><strong>Detection:</strong> isolation-forest on transactional patterns + rule-based triggers for compliance events. <strong>Action:</strong> investigate within 24h · dismiss only if root cause confirmed</p>
      </Card>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "critical", "high", "medium", "low"] as const).map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)} className={cn(
            "h-8 px-3 rounded-full text-xs font-medium border transition-colors capitalize",
            severityFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-surface-sunken text-muted-foreground"
          )}>
            {s}
            <span className={cn("ml-1.5 tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold", severityFilter === s ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground")}>
              {s === "all" ? anomalies.filter(a => a.status !== "dismissed").length : anomalies.filter(a => a.severity === s && a.status !== "dismissed").length}
            </span>
          </button>
        ))}
      </div>

      {/* Anomaly cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
            <p className="font-medium">No anomalies in this filter</p>
            <p className="text-xs text-muted-foreground mt-1">All clear · model continuously scanning</p>
          </Card>
        ) : filtered.map(a => {
          const Icon = TYPE_ICON[a.type];
          return (
            <Card key={a.id} className={cn(
              "p-4",
              a.severity === "critical" && "border-l-4 border-l-danger ring-1 ring-danger/20",
              a.severity === "high" && "border-l-4 border-l-danger",
              a.severity === "medium" && "border-l-4 border-l-warning",
              a.status === "investigating" && "bg-warning-soft/10",
            )}>
              <div className="flex items-start gap-3">
                <span className={cn(
                  "h-10 w-10 rounded-md inline-flex items-center justify-center shrink-0",
                  a.severity === "critical" ? "bg-danger text-white animate-pulse" :
                  a.severity === "high" ? "bg-danger-soft text-danger" :
                  a.severity === "medium" ? "bg-warning-soft text-warning" : "bg-info-soft text-info"
                )}><Icon className="h-4 w-4" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="font-semibold">{a.title}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                      <Badge tone="neutral">{a.type.replace("_", " ")}</Badge>
                      {a.status === "investigating" && <Badge tone="warning">investigating</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
                  <div className="mt-2 pt-2 border-t border-border space-y-1 text-xs">
                    <p><strong>Detected:</strong> <span className="tabular text-muted-foreground">{a.detectedAt}</span></p>
                    <p><strong>Actor:</strong> <span className="text-muted-foreground">{a.actor}</span></p>
                    <p><strong>Evidence:</strong> <span className="font-mono tabular text-muted-foreground">{a.evidence}</span></p>
                    <p className="text-info inline-flex items-start gap-1.5"><Lightbulb className="h-3 w-3 shrink-0 mt-0.5" /><span><strong>Suggested action:</strong> {a.suggestion}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {a.status === "new" && (
                      <Button size="sm" variant="outline" onClick={() => { setAnomalies(prev => prev.map(x => x.id === a.id ? { ...x, status: "investigating" } : x)); onToast(`${a.title} · marked under investigation`); }}>
                        <Eye className="h-3 w-3" />Investigate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => onToast("Escalated to manager via WhatsApp")}>
                      <Send className="h-3 w-3" />Escalate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAnomalies(prev => prev.map(x => x.id === a.id ? { ...x, status: "dismissed" } : x)); onToast("Dismissed · logged with reason"); }}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// VOICE BOOKING TAB
// ============================================================
type VoiceCall = {
  id: string;
  callerName: string;
  callerPhone: string;
  duration: string;
  receivedAt: string;
  transcript: { who: "agent" | "caller"; text: string }[];
  extracted: {
    guestName: string;
    phone: string;
    email?: string;
    arrival: string;
    nights: number;
    adults: number;
    children: number;
    roomType: string;
    ratePlan: string;
    specialRequests: string[];
    estimatedTotal: number;
  };
  status: "new" | "confirmed" | "discarded";
};

const VOICE_CALLS: VoiceCall[] = [
  {
    id: "vc1",
    callerName: "Mr. Vikram Saxena",
    callerPhone: "+91 98201 33445",
    duration: "3:42",
    receivedAt: "Today 11:24",
    transcript: [
      { who: "agent",  text: "Good morning, The Pearl Marina, how may I help you?" },
      { who: "caller", text: "Hi, I'd like to book a room for next weekend please — Friday to Sunday." },
      { who: "agent",  text: "Of course sir, may I have your name?" },
      { who: "caller", text: "Vikram Saxena. I'm calling from Mumbai." },
      { who: "agent",  text: "Thank you Mr. Saxena. How many guests will be staying?" },
      { who: "caller", text: "Two adults, my wife and I. Anniversary trip. We'd love a deluxe room with sea view if possible, on a higher floor." },
      { who: "agent",  text: "Wonderful, anniversary! Will you require breakfast as well?" },
      { who: "caller", text: "Yes please — breakfast for both included." },
      { who: "agent",  text: "Great. So Friday 30 May to Sunday 1 June, two nights, deluxe room with sea view, breakfast included. Anything special I should arrange?" },
      { who: "caller", text: "Yes, can you arrange a cake and flowers for our anniversary on Saturday night?" },
      { who: "agent",  text: "Absolutely. My email is reservations@thepearl.in if you'd like to confirm in writing. Total would be around ₹19,400 including the package." },
      { who: "caller", text: "Perfect. Email me the confirmation at vikram.saxena@example.com." },
    ],
    extracted: {
      guestName: "Vikram Saxena",
      phone: "+91 98201 33445",
      email: "vikram.saxena@example.com",
      arrival: "2026-05-30",
      nights: 2,
      adults: 2,
      children: 0,
      roomType: "Deluxe (Sea view, high floor)",
      ratePlan: "CP (Continental Plan · breakfast)",
      specialRequests: ["Anniversary trip", "Cake on Saturday night", "Flowers in room"],
      estimatedTotal: 19400,
    },
    status: "new",
  },
];

function VoiceTab({ onToast }: { onToast: (m: string) => void }) {
  const [calls, setCalls] = React.useState<VoiceCall[]>(VOICE_CALLS);
  const [selected, setSelected] = React.useState<VoiceCall>(VOICE_CALLS[0]);

  const handleConfirm = () => {
    setCalls(prev => prev.map(c => c.id === selected.id ? { ...c, status: "confirmed" } : c));
    onToast(`Booking created · ${selected.extracted.guestName} · ${selected.extracted.arrival}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-info-soft/15 border-info/20 text-xs flex items-start gap-2">
        <Brain className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
        <p><strong>Pipeline:</strong> Twilio call recording → Whisper speech-to-text → Claude function-calling extracts guest + dates + room + preferences → human approves → creates booking. <strong>Average handle time:</strong> 30 seconds (vs 4-5 min manual entry)</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3">
        {/* Call card + transcript */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-full bg-success-soft text-success inline-flex items-center justify-center"><PhoneIncoming className="h-5 w-5" /></span>
              <div>
                <p className="font-semibold">{selected.callerName}</p>
                <p className="text-[11px] text-muted-foreground tabular">{selected.callerPhone} · {selected.duration} · {selected.receivedAt}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onToast("Playing recording…")}>
              <Volume2 className="h-3.5 w-3.5" />Play recording
            </Button>
          </div>

          <div className="rounded-md border border-border bg-surface-sunken/30 p-3 max-h-[400px] overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 inline-flex items-center gap-1.5"><MessageCircle className="h-3 w-3" />Transcript</p>
            <ul className="space-y-2">
              {selected.transcript.map((line, i) => (
                <li key={i} className={cn("flex gap-2", line.who === "agent" ? "" : "flex-row-reverse")}>
                  <span className={cn(
                    "h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0",
                    line.who === "agent" ? "bg-brand text-brand-foreground" : "bg-surface-elevated border border-border"
                  )}>{line.who === "agent" ? "A" : "C"}</span>
                  <div className={cn(
                    "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                    line.who === "agent" ? "bg-brand-soft/30" : "bg-surface"
                  )}>{line.text}</div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Extracted booking */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" />AI-extracted booking</p>
            <Badge tone={selected.status === "confirmed" ? "success" : selected.status === "discarded" ? "danger" : "neutral"}>{selected.status}</Badge>
          </div>

          <div className="space-y-2.5">
            <Field k="Guest" v={selected.extracted.guestName} />
            <Field k="Phone" v={selected.extracted.phone} mono />
            {selected.extracted.email && <Field k="Email" v={selected.extracted.email} />}
            <Field k="Arrival" v={selected.extracted.arrival} mono />
            <Field k="Stay" v={`${selected.extracted.nights} night${selected.extracted.nights === 1 ? "" : "s"} · ${selected.extracted.adults} adults${selected.extracted.children > 0 ? ` + ${selected.extracted.children} children` : ""}`} />
            <Field k="Room type" v={selected.extracted.roomType} />
            <Field k="Rate plan" v={selected.extracted.ratePlan} />
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Special requests</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.extracted.specialRequests.map(s => <Badge key={s} tone="accent">{s}</Badge>)}
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Estimated total</span>
              <span className="text-xl font-bold tabular text-brand">{money(selected.extracted.estimatedTotal)}</span>
            </div>
          </div>

          <div className="flex gap-1.5 mt-4 pt-3 border-t border-border">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onToast("Booking opened in editor — adjust before confirming")}>
              <Pencil className="h-3 w-3" />Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCalls(prev => prev.map(c => c.id === selected.id ? { ...c, status: "discarded" } : c)); onToast("Call discarded"); }}>
              Discard
            </Button>
            <Button size="sm" className="flex-1" onClick={handleConfirm} disabled={selected.status !== "new"}>
              <CheckCircle2 className="h-3 w-3" />Create booking
            </Button>
          </div>
        </Card>
      </div>

      {/* Call queue */}
      <Card className="p-3">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Recent calls</p>
        <p className="text-xs text-muted-foreground">More calls would appear here from your VoIP / Twilio webhook integration · current: 1 awaiting review</p>
      </Card>
    </div>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground shrink-0">{k}</span>
      <span className={cn("text-sm text-right truncate", mono && "font-mono tabular")}>{v}</span>
    </div>
  );
}
