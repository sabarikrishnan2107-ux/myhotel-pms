"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Menu, Plus, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/bell-dropdown";
import { logout } from "@/lib/api";

interface TopBarProps {
  onOpenSidebar: () => void;
}

export function TopBar({ onOpenSidebar }: TopBarProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  // ⌘K / Ctrl+K → focus search · Esc → blur
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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

      {/* Global search */}
      <div className="ml-auto md:ml-4 flex-1 max-w-md relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search guests, rooms, bookings, invoices…"
          className="w-full h-9 pl-9 pr-12 rounded-md border border-border bg-surface text-sm placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden transition-shadow focus-visible:shadow-soft"
          aria-label="Global search (Cmd+K)"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1">
          <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-border bg-surface-sunken px-1.5 text-[10px] font-mono text-muted-foreground">⌘K</kbd>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
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
