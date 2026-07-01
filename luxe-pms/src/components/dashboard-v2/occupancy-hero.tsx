import { Info, ArrowUp } from "lucide-react";

interface Props {
  pct: number;
  occupiedRooms: number;
  totalRooms: number;
  trendPct: number;
}

export function OccupancyHeroV2({ pct, occupiedRooms, totalRooms, trendPct }: Props) {
  const radius = 24;
  const thickness = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const size = (radius + thickness) * 2;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E2761] to-[#2D1B69] p-5 text-white shadow-lg flex flex-col items-center text-center gap-1.5 h-full">
      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/70 font-semibold inline-flex items-center gap-1 relative z-10">
        Occupancy <Info className="h-3 w-3" />
      </p>
      <div className="relative z-10 shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={thickness} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke="#F5B800" strokeWidth={thickness} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
          {pct}%
        </div>
      </div>
      <p className="text-[11px] text-white/70 relative z-10">{occupiedRooms} of {totalRooms} occupied</p>
      <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4ADE80] relative z-10">
        <ArrowUp className="h-3 w-3" /> {trendPct}%
      </p>
    </div>
  );
}
