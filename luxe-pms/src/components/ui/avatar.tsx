import { cn, initials } from "@/lib/utils";

export function Avatar({ name, size = 32, vip = false, className }: { name: string; size?: number; vip?: boolean; className?: string }) {
  const text = initials(name);
  return (
    <div className="relative inline-flex">
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground font-medium select-none",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-label={name}
      >
        {text}
      </div>
      {vip && (
        <span
          className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-brand text-brand-foreground border-2 border-surface font-bold"
          style={{ width: size * 0.45, height: size * 0.45, fontSize: size * 0.22 }}
          title="VIP"
        >
          ★
        </span>
      )}
    </div>
  );
}
