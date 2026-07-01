import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Props {
  pct: number;
  occupiedRooms: number;
  totalRooms: number;
  trendPct: number;
}

export function OccupancyHeroV2({ pct, occupiedRooms, totalRooms, trendPct }: Props) {
  const radius = 70;
  const thickness = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const size = (radius + thickness) * 2;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101A33] to-[#1E2A4A] p-6 text-white shadow-lg lg:col-span-2 flex items-center gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] text-white/60 font-semibold">Occupancy Today</p>
        <p className="text-5xl font-bold tracking-tight mt-2">{pct}%</p>
        <p className="text-sm text-white/70 mt-2">{occupiedRooms} of {totalRooms} rooms occupied</p>
        <p className="text-xs text-[#22C55E] font-semibold mt-3 inline-flex items-center gap-1">
          <ArrowUpRight className="h-3.5 w-3.5" /> {trendPct}% vs yesterday
        </p>
        <Link
          href="/reports"
          className="mt-5 inline-flex items-center rounded-lg border border-white/20 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 transition-colors"
        >
          View detailed report
        </Link>
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 hidden sm:block">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#F5B800" strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </div>
  );
}
