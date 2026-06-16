"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Menu, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/bell-dropdown";
import { logout } from "@/lib/api";
import { clearRole } from "@/lib/auth";
import { useProperty, hotelName } from "@/lib/use-property";

interface TopBarProps {
  onOpenSidebar: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const router = useRouter();
  const property = useProperty();
  const name = hotelName(property, "");

  // Live clock — updates every minute (client-only to avoid hydration mismatch).
  const [clock, setClock] = React.useState<{ time: string; date: string } | null>(null);
  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock({
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
      });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const onLogout = async () => {
    await logout();
    clearRole();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-surface flex items-center gap-3 px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="lg:hidden h-9 w-9 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Link href="/dashboard" className="min-w-0 flex items-center">
        <span className="font-display font-semibold text-lg tracking-tight truncate">
          {name || "Dashboard"}
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden sm:flex flex-col items-end leading-tight pr-1">
          <span className="text-sm font-semibold tabular">{clock?.time ?? "—"}</span>
          <span className="text-[10px] text-brand font-semibold tabular tracking-wide">{clock?.date ?? ""}</span>
        </div>

        <Link href="/bookings/new">
          <Button size="sm" className="hidden sm:inline-flex">
            <Plus className="h-3.5 w-3.5" />
            New Booking
          </Button>
        </Link>

        <Link href="/ai">
          <Button variant="ghost" size="icon" aria-label="AI Assistant" title="AI Assistant">
            <Bot className="h-4 w-4" />
          </Button>
        </Link>

        <NotificationBell />

        <ThemeToggle />

        <button className="flex items-center gap-2 pl-2 pr-3 h-9 rounded-md hover:bg-surface-sunken transition-colors">
          <Avatar name="Reception Khalid" size={28} />
          <span className="hidden xl:flex flex-col text-left leading-tight">
            <span className="text-xs font-medium">Khalid R.</span>
            <span className="text-[10px] text-muted-foreground">Reception · Shift #4218</span>
          </span>
        </button>

        <button
          onClick={onLogout}
          className="h-9 w-9 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
