import type { FloorRowV2, RoomStatusV2 } from "./types";

const STATUS_STYLE: Record<RoomStatusV2, string> = {
  available: "bg-[#DCFCE7] text-[#16A34A]",
  occupied: "bg-[#F5B800] text-white",
  reserved: "bg-[#DBEAFE] text-[#2563EB]",
  "out-of-order": "bg-[#F43F5E] text-white",
  blocked: "bg-[#E5E7EB] text-[#6B7280]",
};

const LEGEND_DOT: Record<RoomStatusV2, string> = {
  available: "bg-[#22C55E]",
  occupied: "bg-[#F5B800]",
  reserved: "bg-[#3B82F6]",
  "out-of-order": "bg-[#F43F5E]",
  blocked: "bg-[#9CA3AF]",
};

interface Props {
  floors: FloorRowV2[];
  legend: { status: RoomStatusV2; label: string }[];
}

export function RoomStatusGridV2({ floors, legend }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.08em]">Live Room Status</p>
        <span className="text-[11px] font-medium text-[#6B7280] border border-[#E5E7EB] rounded-lg px-2.5 py-1">All Floors</span>
      </div>
      <div className="space-y-2">
        {floors.map(row => (
          <div key={row.floor} className="flex items-center gap-2.5">
            <span className="w-7 text-[11px] font-bold text-[#6B7280] shrink-0">{row.floor}</span>
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {row.rooms.map(room => (
                <span
                  key={room.number}
                  className={`h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${STATUS_STYLE[room.status]}`}
                >
                  {room.number}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#6B7280]">
        {legend.map(l => (
          <span key={l.status} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${LEGEND_DOT[l.status]}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
