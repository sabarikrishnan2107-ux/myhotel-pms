"use client";
import * as React from "react";

// ========================= TYPES =========================
export type NotifCategory = "booking" | "payment" | "housekeeping" | "maintenance" | "guest" | "system" | "security" | "marketing";
export type NotifPriority = "low" | "normal" | "high" | "urgent";

export interface Notif {
  id: string;
  category: NotifCategory;
  priority: NotifPriority;
  title: string;
  message: string;
  createdAt: number; // epoch ms relative to "now" reference (frozen for SSR safety)
  read: boolean;
  snoozedUntil?: number;
  dismissed?: boolean;
  actionLabel?: string;
  actionHref?: string;
  contextRef?: string;
  actor?: string;
}

type ChannelPrefs = { email: boolean; whatsapp: boolean; sms: boolean; push: boolean };
export type NotifPreferences = {
  channels: Record<NotifCategory, ChannelPrefs>;
  mutedCategories: NotifCategory[];
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  sound: boolean;
  desktop: boolean;
};

// ========================= SEED =========================
// "Now" reference frozen so SSR/CSR match; durations relative to it
const NOW_REF = 1748150000000;       // arbitrary fixed epoch (~mid 2026)
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

export const SEED_NOTIFS: Notif[] = [
  // Urgent / unread
  { id: "n1", category: "payment", priority: "urgent", title: "Card declined — Room 412", message: "VISA •••4221 was declined for the BK100242 advance payment of ₹14,500. Guest is at reception waiting.", createdAt: NOW_REF - 3 * MIN, read: false, actionLabel: "Re-attempt payment", actionHref: "/folio/BK100242", contextRef: "BK100242", actor: "POS Terminal" },
  { id: "n2", category: "security", priority: "urgent", title: "Cash drawer variance > ₹500", message: "Shift #4221 (Priya M.) closed with ₹500 short. Variance reason marked as 'Cashier error'. Requires manager verification.", createdAt: NOW_REF - 8 * MIN, read: false, actionLabel: "Verify shift", actionHref: "/accounts", actor: "Cashier Module" },
  { id: "n3", category: "housekeeping", priority: "high", title: "5 rooms still dirty for 3 PM arrivals", message: "Rooms 302, 305, 408, 411, 506 are still in 'dirty' status. 8 guests checking in at 3:00 PM.", createdAt: NOW_REF - 12 * MIN, read: false, actionLabel: "Open HK board", actionHref: "/housekeeping", actor: "HK Auto-monitor" },

  // High priority — read = false
  { id: "n4", category: "booking", priority: "high", title: "New OTA booking · Booking.com", message: "Karan Mehta · Deluxe Twin · 3 nights · 27 May → 30 May · ₹28,500. Auto-confirmed.", createdAt: NOW_REF - 35 * MIN, read: false, actionLabel: "Open booking", actionHref: "/bookings", contextRef: "BK100258", actor: "Channel Manager" },
  { id: "n5", category: "maintenance", priority: "high", title: "Elevator A — preventive due in 2 days", message: "AMC schedule MNT-ELE-Q2 with ElevPro Engineering · 27 May 10:00 AM. Last service: 27 Feb 2026.", createdAt: NOW_REF - 55 * MIN, read: false, actionLabel: "View schedule", actionHref: "/maintenance", contextRef: "MNT-ELE-Q2", actor: "Maintenance Auto" },
  { id: "n6", category: "guest", priority: "high", title: "VIP arriving today — Anjali Iyer", message: "Suite 1201 · ETA 4:30 PM · vegetarian breakfast pre-ordered · welcome amenity required. Loyalty tier: Platinum.", createdAt: NOW_REF - 75 * MIN, read: false, actionLabel: "View guest", actionHref: "/guests", actor: "Pre-arrival rule" },

  // Normal priority
  { id: "n7", category: "payment", priority: "normal", title: "₹15,000 received via UPI", message: "GPay transaction 240523AB142 from Sarah Whitfield (BK100225) reconciled to HDFC operating A/c.", createdAt: NOW_REF - 90 * MIN, read: false, actionLabel: "View folio", actionHref: "/folio", contextRef: "BK100225", actor: "Payment Gateway" },
  { id: "n8", category: "housekeeping", priority: "normal", title: "Lost & Found logged — Room 306", message: "Apple AirPods Pro found by Maria L. (HK) during turnover. Stored in safe locker #12.", createdAt: NOW_REF - 2 * HR, read: false, actionLabel: "View L&F", actionHref: "/housekeeping", actor: "Maria L. (HK)" },
  { id: "n9", category: "booking", priority: "normal", title: "Group block confirmed — TechCorp", message: "30 rooms × 3 nights from 5 June. Advance ₹3.6L received. Master folio created.", createdAt: NOW_REF - 3 * HR, read: false, actionLabel: "View group", actionHref: "/groups", contextRef: "GRP-2026-082", actor: "Sales · Priya" },

  // Read / yesterday
  { id: "n10", category: "system", priority: "normal", title: "Night audit completed", message: "Audit run for 23 May 2026 — 47 rooms posted, 3 charges reviewed, 0 errors. Posted by automation.", createdAt: NOW_REF - 14 * HR, read: true, actionLabel: "View audit", actionHref: "/accounts", actor: "Night Audit" },
  { id: "n11", category: "payment", priority: "normal", title: "GSTR-3B for May due in 26 days", message: "Reminder · file by 20 Jun 2026. Estimated liability ₹2.47L. JSON ready for upload.", createdAt: NOW_REF - 18 * HR, read: true, actionLabel: "File now", actionHref: "/accounts", actor: "Compliance Bot" },
  { id: "n12", category: "maintenance", priority: "normal", title: "Maintenance ticket resolved — Room 408 AC", message: "Cooling issue fixed by Joseph D. · part replaced (capacitor). Total time: 47 min.", createdAt: NOW_REF - DAY - 2 * HR, read: true, actionLabel: "View ticket", actionHref: "/maintenance", contextRef: "TKT-441", actor: "Joseph D." },

  // Earlier this week
  { id: "n13", category: "guest", priority: "low", title: "Feedback received — 5★", message: "Liu Wei left a 5-star review on TripAdvisor for stay 18-21 May. \"Spotless rooms, attentive staff.\"", createdAt: NOW_REF - 2 * DAY, read: true, actionLabel: "Open review", actionHref: "#", actor: "Review Bot" },
  { id: "n14", category: "marketing", priority: "low", title: "Pre-arrival WhatsApp sent to 12 guests", message: "Pre-arrival welcome template fired for arrivals on 24 May. 11 delivered, 1 failed.", createdAt: NOW_REF - 2 * DAY - 4 * HR, read: true, actionLabel: "Delivery log", actionHref: "/notifications", actor: "Campaign · Pre-arrival" },
  { id: "n15", category: "security", priority: "high", title: "Failed login attempts · admin user", message: "5 failed attempts on admin@thepearl.in from IP 103.244.x.x between 02:14 and 02:18. Account auto-locked.", createdAt: NOW_REF - 3 * DAY, read: true, actionLabel: "Review", actionHref: "#", actor: "Auth System" },
];

// ========================= DEFAULT PREFERENCES =========================
const ALL_CATEGORIES: NotifCategory[] = ["booking", "payment", "housekeeping", "maintenance", "guest", "system", "security", "marketing"];

const defaultChannels: ChannelPrefs = { email: true, whatsapp: true, sms: false, push: true };
export const DEFAULT_PREFS: NotifPreferences = {
  channels: ALL_CATEGORIES.reduce((acc, c) => {
    acc[c] = c === "marketing"
      ? { email: true, whatsapp: false, sms: false, push: false }
      : c === "security"
        ? { email: true, whatsapp: true, sms: true, push: true }
        : { ...defaultChannels };
    return acc;
  }, {} as Record<NotifCategory, ChannelPrefs>),
  mutedCategories: [],
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
  sound: true,
  desktop: false,
};

// ========================= CONTEXT =========================
type Ctx = {
  notifs: Notif[];
  prefs: NotifPreferences;
  unreadCount: number;
  urgentCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  snooze: (id: string, minutes: number) => void;
  setChannelPref: (cat: NotifCategory, channel: keyof ChannelPrefs, on: boolean) => void;
  toggleMute: (cat: NotifCategory) => void;
  setPref: <K extends keyof NotifPreferences>(k: K, v: NotifPreferences[K]) => void;
  refNow: number; // exposes the frozen reference for relative-time rendering
};

const NotifCtx = React.createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifs, setNotifs] = React.useState<Notif[]>(SEED_NOTIFS);
  const [prefs, setPrefs] = React.useState<NotifPreferences>(DEFAULT_PREFS);

  const visibleNotifs = notifs.filter(n => !n.dismissed);
  const unreadCount = visibleNotifs.filter(n => !n.read).length;
  const urgentCount = visibleNotifs.filter(n => !n.read && n.priority === "urgent").length;

  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  const snooze = (id: string, minutes: number) =>
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, snoozedUntil: NOW_REF + minutes * MIN, read: true } : n));

  const setChannelPref = (cat: NotifCategory, channel: keyof ChannelPrefs, on: boolean) =>
    setPrefs(p => ({ ...p, channels: { ...p.channels, [cat]: { ...p.channels[cat], [channel]: on } } }));

  const toggleMute = (cat: NotifCategory) =>
    setPrefs(p => ({
      ...p,
      mutedCategories: p.mutedCategories.includes(cat)
        ? p.mutedCategories.filter(c => c !== cat)
        : [...p.mutedCategories, cat],
    }));

  const setPref = <K extends keyof NotifPreferences>(k: K, v: NotifPreferences[K]) =>
    setPrefs(p => ({ ...p, [k]: v }));

  const value: Ctx = {
    notifs: visibleNotifs, prefs,
    unreadCount, urgentCount,
    markRead, markAllRead, dismiss, snooze,
    setChannelPref, toggleMute, setPref,
    refNow: NOW_REF,
  };

  return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>;
}

export function useNotifications(): Ctx {
  const ctx = React.useContext(NotifCtx);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}

// ========================= HELPERS =========================
export function relativeTime(then: number, now: number): string {
  const diff = Math.max(0, now - then);
  if (diff < MIN) return "just now";
  if (diff < HR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(then).toLocaleDateString("en-IN");
}

export function timeBucket(then: number, now: number): "today" | "yesterday" | "earlier" {
  const diff = now - then;
  if (diff < 18 * HR) return "today";
  if (diff < 36 * HR) return "yesterday";
  return "earlier";
}

export const CATEGORY_META: Record<NotifCategory, { label: string; tone: "brand" | "info" | "warning" | "danger" | "success" | "neutral" | "accent" }> = {
  booking:      { label: "Bookings",     tone: "brand"   },
  payment:      { label: "Payments",     tone: "success" },
  housekeeping: { label: "Housekeeping", tone: "info"    },
  maintenance:  { label: "Maintenance",  tone: "warning" },
  guest:        { label: "Guests",       tone: "accent"  },
  system:       { label: "System",       tone: "neutral" },
  security:     { label: "Security",     tone: "danger"  },
  marketing:    { label: "Marketing",    tone: "neutral" },
};

export const PRIORITY_TONE: Record<NotifPriority, "neutral" | "info" | "warning" | "danger"> = {
  low: "neutral", normal: "info", high: "warning", urgent: "danger",
};
