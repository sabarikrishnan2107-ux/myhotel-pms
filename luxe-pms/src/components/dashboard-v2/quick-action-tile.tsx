import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { TONE_STYLES, type ToneV2 } from "./tokens";

interface Props {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: ToneV2;
  badge?: number;
}

export function QuickActionTileV2({ label, href, icon: Icon, tone, badge }: Props) {
  const s = TONE_STYLES[tone];
  return (
    <Link
      href={href}
      className="relative rounded-2xl bg-white dark:bg-[#141B2E] p-4 shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_4px_16px_-6px_rgb(0_0_0_/_0.08)] hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col items-center text-center gap-2.5"
    >
      <span className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.soft} ${s.text}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-[#111827] dark:text-[#E8ECF4]">{label}</p>
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute top-3 right-3 h-5 min-w-[20px] px-1 rounded-full bg-[#F43F5E] text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  );
}
