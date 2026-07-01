import type { LucideIcon } from "lucide-react";
import { TONE_STYLES, type ToneV2 } from "./tokens";

interface Props {
  label: string;
  value: number | string;
  badge?: string;
  caption: string;
  icon: LucideIcon;
  tone: ToneV2;
}

export function KpiCardV2({ label, value, badge, caption, icon: Icon, tone }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <div className="relative rounded-2xl bg-white dark:bg-[#141B2E] p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      {badge && (
        <span className={`absolute top-5 right-5 text-[11px] font-bold rounded-md px-1.5 py-0.5 ${s.soft} ${s.text}`}>{badge}</span>
      )}
      <span className={`absolute top-5 left-5 h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p
        className={`text-sm uppercase tracking-[0.1em] font-medium truncate text-right ${s.text}`}
        style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#111827] dark:text-[#E8ECF4] text-right">{value}</p>
      <p className="text-[11px] text-[#111827] dark:text-[#E8ECF4] mt-2 text-right">{caption}</p>
    </div>
  );
}
