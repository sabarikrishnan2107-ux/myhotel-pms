"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, DoorOpen, CalendarRange, Users, Sparkles, Wrench,
  Wallet, FileBarChart, SlidersHorizontal, Globe, UserCog, Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_V2: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/dashboard-v2", icon: LayoutDashboard },
  { label: "Front Desk", href: "/rack", icon: DoorOpen },
  { label: "Reservations", href: "/bookings", icon: CalendarRange },
  { label: "Guests", href: "/guests", icon: Users },
  { label: "Housekeeping", href: "/housekeeping", icon: Sparkles },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Finance", href: "/accounts", icon: Wallet },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Rooms & Rates", href: "/setup", icon: SlidersHorizontal },
  { label: "Channel Manager", href: "/channels", icon: Globe },
  { label: "Staff", href: "/staff", icon: UserCog },
  { label: "Settings", href: "/setup", icon: Settings },
];

export function SidebarV2() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-[#101A33] text-white">
      <div className="h-20 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
        <span className="h-10 w-10 rounded-lg bg-[#F5B800] text-[#101A33] flex items-center justify-center font-bold text-sm shrink-0">
          PP
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">The Pearl Palace</p>
          <p className="text-[11px] text-white/50 truncate">Luxury Hotel &amp; Resort</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_V2.map(item => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[#6D4AFF] text-white font-semibold shadow-md shadow-[#6D4AFF]/30"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="rounded-lg bg-white/5 p-3 text-xs text-white/60">
          <p className="font-medium text-white/80">Quick Support</p>
          <p className="mt-0.5">We are online 24/7</p>
        </div>
      </div>
    </aside>
  );
}
