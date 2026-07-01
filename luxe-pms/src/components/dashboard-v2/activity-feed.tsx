import type { ActivityItemV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  items: ActivityItemV2[];
}

export function ActivityFeedV2({ items }: Props) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-[#111827] dark:text-[#E8ECF4] uppercase tracking-[0.08em]">Recent Activity</p>
        <button type="button" className="text-xs font-semibold text-[#6D4AFF] hover:underline">View all</button>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {items.map(item => {
          const s = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex items-center gap-2.5">
              <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#111827] dark:text-[#E8ECF4] truncate">{item.title}</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#8B94A8] truncate">{item.actor} · {item.time}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
