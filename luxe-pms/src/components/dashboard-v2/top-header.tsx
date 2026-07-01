"use client";
import * as React from "react";
import Link from "next/link";
import { Search, Plus, Bell, Clock, ChevronDown } from "lucide-react";
import { initials } from "@/lib/utils";

interface Props {
  notificationCount: number;
  currentUser: { name: string; role: string; shift: string };
}

export function TopHeaderV2({ notificationCount, currentUser }: Props) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock value only exists client-side
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const timeLabel = now ? now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "--:--";
  const dateLabel = now
    ? `${now.toLocaleDateString([], { weekday: "long" })}, ${now.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })}`
    : "";

  return (
    <header className="sticky top-0 z-20 h-20 flex items-center gap-4 bg-white px-6 border-b border-[#E5E7EB]">
      <div className="w-80 shrink-0">
        <div className="flex items-center gap-2 rounded-xl bg-[#F7F8FC] px-3.5 py-2.5 text-sm text-[#6B7280]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search by guest, booking, room...</span>
          <kbd className="text-[10px] font-semibold text-[#6B7280]/70 border border-[#E5E7EB] rounded px-1.5 py-0.5">⌘K</kbd>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 pr-2">
          <Clock className="h-4 w-4 text-[#6B7280]" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#111827] tabular-nums">{timeLabel}</p>
            <p className="text-[11px] text-[#6B7280]">{dateLabel}</p>
          </div>
        </div>
        <Link
          href="/bookings/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6D4AFF] text-white text-sm font-semibold px-4 py-2.5 shadow-md shadow-[#6D4AFF]/25 hover:bg-[#5d3ce6] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" /> New Booking
        </Link>
        <button type="button" className="relative h-10 w-10 rounded-xl flex items-center justify-center text-[#6B7280] hover:bg-[#F7F8FC] hover:text-[#111827] transition-colors shrink-0" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>
        <button type="button" className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB] shrink-0">
          <span className="h-10 w-10 rounded-full bg-[#EEEAFF] text-[#6D4AFF] flex items-center justify-center text-sm font-bold">
            {initials(currentUser.name)}
          </span>
          <div className="hidden xl:block leading-tight text-left">
            <p className="text-sm font-semibold text-[#111827]">{currentUser.name}</p>
            <p className="text-[11px] text-[#6D4AFF]/70">{currentUser.role} · {currentUser.shift}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-[#6B7280] hidden xl:block" />
        </button>
      </div>
    </header>
  );
}
