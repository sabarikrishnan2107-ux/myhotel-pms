import type { LucideIcon } from "lucide-react";
import { TONE_STYLES, type ToneV2 } from "./tokens";

interface Props {
  label: string;
  value: number;
  badge?: string;
  caption: string;
  icon: LucideIcon;
  tone: ToneV2;
}

export function KpiCardV2({ label, value, badge, caption, icon: Icon, tone }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#6B7280]">{label}</p>
        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${s.soft} ${s.text}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight text-[#111827]">{value}</p>
        {badge && (
          <span className={`text-[11px] font-bold rounded-md px-1.5 py-0.5 ${s.soft} ${s.text}`}>{badge}</span>
        )}
      </div>
      <p className="text-[11px] text-[#6B7280] mt-2">{caption}</p>
    </div>
  );
}
