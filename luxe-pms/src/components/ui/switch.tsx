import { cn } from "@/lib/utils";

// Canonical enable/disable toggle. Uses flexbox (justify-start/justify-end) to
// place the knob flush at the correct end — robust to font/density scaling,
// unlike a hardcoded translate. Green track + knob right = on; gray + left = off.
export function Switch({
  checked,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? "Toggle"}
      disabled={disabled}
      onClick={onChange ? () => onChange(!checked) : undefined}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-success justify-end" : "bg-zinc-300 dark:bg-zinc-600 justify-start",
        className,
      )}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
    </button>
  );
}
