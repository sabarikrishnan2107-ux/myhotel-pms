import { type LucideIcon } from "lucide-react";

/** Uppercase section divider with an optional leading icon and trailing hint. */
export function SectionHeader({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-brand" />}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-subtle-foreground">{title}</h2>
      </div>
      {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
      <div className="flex-1 h-px bg-border ml-2" />
    </div>
  );
}
