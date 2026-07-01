import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ArrivalDepartureRowV2 } from "./types";
import { initials } from "@/lib/utils";

interface Props {
  title: string;
  icon: LucideIcon;
  summary: string;
  rows: ArrivalDepartureRowV2[];
  viewAllHref: string;
  emptyLabel: string;
}

export function ArrivalDepartureCardV2({ title, icon: Icon, summary, rows, viewAllHref, emptyLabel }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <span className="h-12 w-12 rounded-xl bg-[#EEEAFF] text-[#6D4AFF] flex items-center justify-center shrink-0">
            <Icon className="h-6 w-6" />
          </span>
          <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.06em]">{title}</p>
        </div>
        <Link href={viewAllHref} className="text-xs font-semibold text-[#6D4AFF] hover:underline">View all</Link>
      </div>
      <p className="text-xs text-[#6B7280] mb-3 pl-[58px]">{summary}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280] text-center py-6">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.id} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] px-3 py-2.5">
              <span className="h-9 w-9 rounded-full bg-[#F5B800] text-[#101A33] flex items-center justify-center text-xs font-bold shrink-0">
                {initials(row.guestName)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[#111827] truncate">{row.guestName}</p>
                  {row.tag && <span className="text-[10px] font-bold rounded-full bg-[#EEEAFF] text-[#6D4AFF] px-2 py-0.5 shrink-0">{row.tag}</span>}
                </div>
                <p className="text-xs text-[#6B7280] truncate mt-0.5">{row.meta}</p>
              </div>
              {row.status === "settled" && (
                <span className="text-[11px] font-semibold text-[#16A34A] shrink-0">Settled</span>
              )}
              <button type="button" className="text-xs font-semibold rounded-lg bg-[#6D4AFF] text-white px-3 py-1.5 shrink-0">
                {row.actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
