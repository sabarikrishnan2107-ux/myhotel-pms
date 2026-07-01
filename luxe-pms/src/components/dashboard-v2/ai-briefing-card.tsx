import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { AiBriefingLineV2 } from "./types";
import { TONE_STYLES } from "./tokens";

interface Props {
  lines: AiBriefingLineV2[];
}

export function AiBriefingCardV2({ lines }: Props) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#101A33] to-[#1E2A4A] p-5 text-white shadow-lg flex flex-col h-full">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="h-9 w-9 rounded-xl bg-[#F5B800] text-[#101A33] flex items-center justify-center shrink-0">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <p className="text-sm font-bold flex-1">AI Daily Briefing</p>
        <span className="text-[10px] font-bold rounded-full bg-white/10 px-2 py-1">AI</span>
      </div>
      <ul className="space-y-2.5 text-[13px] flex-1">
        {lines.map((line, i) => {
          const s = TONE_STYLES[line.tone];
          const Icon = line.icon;
          return (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${s.soft} ${s.text}`}>
                <Icon className="h-3 w-3" />
              </span>
              <span className="pt-0.5 leading-snug text-white/90">{line.text}</span>
            </li>
          );
        })}
      </ul>
      <Link
        href="/ai"
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F5B800] text-[#101A33] text-xs font-bold px-4 py-2.5 hover:brightness-95 transition-[filter]"
      >
        View full analysis <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
