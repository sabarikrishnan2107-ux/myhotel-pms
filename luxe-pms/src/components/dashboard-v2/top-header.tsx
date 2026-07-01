"use client";
import * as React from "react";
import Link from "next/link";
import { Search, Plus, Bell } from "lucide-react";

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
  const dateLabel = now ? now.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric", weekday: "long" }) : "";

  return (
    <header className="sticky top-0 z-20 h-20 flex items-center gap-4 bg-white px-6 shadow-[0_1px_0_0_#E5E7EB,0_4px_12px_-4px_rgb(0_0_0_/_0.06)]">
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 rounded-xl bg-[#F7F8FC] px-3.5 py-2.5 text-sm text-[#6B7280]">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Search by guest, booking, room...</span>
          <kbd className="text-[10px] font-semibold text-[#6B7280]/70 border border-[#E5E7EB] rounded px-1.5 py-0.5">⌘K</kbd>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-1.5 text-sm text-[#111827] pr-2">
        <span className="font-semibold tabular-nums">{timeLabel}</span>
        <span className="text-[#6B7280]">·</span>
        <span className="text-[#6B7280]">{dateLabel}</span>
      </div>
      <Link
        href="/bookings/new"
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#6D4AFF] text-white text-sm font-semibold px-4 py-2.5 shadow-md shadow-[#6D4AFF]/25 hover:bg-[#5d3ce6] transition-colors shrink-0"
      >
        <Plus className="h-4 w-4" /> New Booking
      </Link>
      <button type="button" className="relative h-10 w-10 rounded-xl bg-[#F7F8FC] flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-colors shrink-0" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </button>
      <div className="flex items-center gap-2.5 pl-2 border-l border-[#E5E7EB] shrink-0">
        <span className="h-10 w-10 rounded-full bg-[#EEEAFF] text-[#6D4AFF] flex items-center justify-center text-sm font-bold">
          {currentUser.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
        </span>
        <div className="hidden sm:block leading-tight">
          <p className="text-sm font-semibold text-[#111827]">{currentUser.name}</p>
          <p className="text-[11px] text-[#6B7280]">{currentUser.role} · {currentUser.shift}</p>
        </div>
      </div>
    </header>
  );
}
