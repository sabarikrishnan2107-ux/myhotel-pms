"use client";
import * as React from "react";
import Link from "next/link";
import {
  Bell, BedDouble, CreditCard, Sparkles, Wrench, Crown, Settings, Shield, Megaphone,
  CheckCheck, X, Clock, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications, relativeTime, CATEGORY_META, type NotifCategory } from "./store";

const CATEGORY_ICON: Record<NotifCategory, typeof Bell> = {
  booking: BedDouble,
  payment: CreditCard,
  housekeeping: Sparkles,
  maintenance: Wrench,
  guest: Crown,
  system: Settings,
  security: Shield,
  marketing: Megaphone,
};

export function NotificationBell() {
  const { notifs, unreadCount, urgentCount, markRead, markAllRead, snooze, dismiss, refNow } = useNotifications();
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Show top 6 unread first, then recent read
  const unread = notifs.filter(n => !n.read).sort((a, b) => b.createdAt - a.createdAt);
  const recent = notifs.filter(n => n.read).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  const list = [...unread, ...recent].slice(0, 6);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "relative h-9 w-9 rounded-md text-foreground hover:bg-surface-sunken inline-flex items-center justify-center transition-colors",
          open && "bg-surface-sunken"
        )}
        aria-label={`Notifications · ${unreadCount} unread`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <>
            <span className={cn(
              "absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold inline-flex items-center justify-center ring-2 ring-surface",
              urgentCount > 0 ? "bg-danger text-white" : "bg-brand text-brand-foreground"
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            {urgentCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 rounded-full bg-danger animate-ping opacity-60" />
            )}
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-sunken/30">
            <div>
              <p className="font-semibold text-sm">Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount === 0 ? "All caught up" : `${unreadCount} unread${urgentCount > 0 ? ` · ${urgentCount} urgent` : ""}`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-brand hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {list.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Bell className="h-7 w-7 mx-auto text-subtle-foreground mb-2" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">You&apos;ll see alerts here as they come in</p>
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
              {list.map(n => {
                const Icon = CATEGORY_ICON[n.category];
                const meta = CATEGORY_META[n.category];
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "relative px-4 py-3 hover:bg-surface-sunken/40 transition-colors group",
                      !n.read && "bg-brand-soft/10"
                    )}
                  >
                    {!n.read && (
                      <span className={cn(
                        "absolute left-1 top-4 h-2 w-2 rounded-full",
                        n.priority === "urgent" ? "bg-danger" : "bg-brand"
                      )} />
                    )}
                    <div className="flex gap-2.5 ml-2">
                      <span className={cn(
                        "h-8 w-8 rounded-md inline-flex items-center justify-center shrink-0",
                        meta.tone === "brand" && "bg-brand-soft text-brand-soft-foreground",
                        meta.tone === "info" && "bg-info-soft text-info",
                        meta.tone === "warning" && "bg-warning-soft text-warning",
                        meta.tone === "danger" && "bg-danger-soft text-danger",
                        meta.tone === "success" && "bg-success-soft text-success",
                        meta.tone === "accent" && "bg-accent-soft text-accent",
                        meta.tone === "neutral" && "bg-surface-sunken text-muted-foreground",
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-tight", !n.read && "font-semibold")}>{n.title}</p>
                          <p className="text-[10px] text-muted-foreground tabular shrink-0">{relativeTime(n.createdAt, refNow)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                        <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {n.actionHref && (
                            <Link
                              href={n.actionHref}
                              onClick={() => { markRead(n.id); setOpen(false); }}
                              className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-0.5"
                            >
                              {n.actionLabel || "View"}<ArrowRight className="h-2.5 w-2.5" />
                            </Link>
                          )}
                          {!n.read && (
                            <button type="button" onClick={() => markRead(n.id)} className="ml-auto text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                              <CheckCheck className="h-2.5 w-2.5" />Mark read
                            </button>
                          )}
                          <button type="button" onClick={() => snooze(n.id, 60)} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />Snooze 1h
                          </button>
                          <button type="button" onClick={() => dismiss(n.id)} className="text-[11px] text-muted-foreground hover:text-danger inline-flex items-center gap-0.5" title="Dismiss">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border bg-surface-sunken/30">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1"
            >
              View all notifications<ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
