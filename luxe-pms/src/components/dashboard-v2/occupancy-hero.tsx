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
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg flex items-center gap-3 h-full bg-cover bg-center"
      style={{ backgroundImage: "url(/login-bg.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E2761]/95 via-[#1E2761]/85 to-[#2D1B69]/95" />
      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="flex-1 min-w-0 text-left relative z-10">
        <p className="text-[10px] uppercase tracking-[0.12em] text-white/70 font-semibold inline-flex items-center gap-1">
          Occupancy <Info className="h-3 w-3" />
        </p>
        <p className="text-[11px] text-white/70 mt-1">{occupiedRooms} of {totalRooms} occupied</p>
        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4ADE80] mt-1">
          <ArrowUp className="h-3 w-3" /> {trendPct}%
        </p>
      </div>
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
    </div>
  );
}
