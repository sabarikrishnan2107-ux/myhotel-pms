import type { PriorityItemV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  items: PriorityItemV2[];
}

export function PrioritiesListV2({ items }: Props) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] uppercase tracking-[0.08em]">Today&apos;s Priorities</p>
        <span className="text-[11px] font-bold rounded-full bg-[#F7F8FC] text-[#6B7280] px-2.5 py-1">{items.length} Items</span>
      </div>
      <ul className="space-y-1">
        {items.map(item => {
          const s = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[#F7F8FC] transition-colors cursor-pointer">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                  {typeof item.count === "number" && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${s.soft} ${s.text}`}>{item.count}</span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5 truncate">{item.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
