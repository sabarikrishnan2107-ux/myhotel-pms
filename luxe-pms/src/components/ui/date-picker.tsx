"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Styled, theme-aware replacement for `<input type="date">`.
 *
 * Drop-in compatible with the native control: `value`/`min`/`max` use ISO
 * `yyyy-mm-dd` strings and `onChange` is called with a native-like event whose
 * `target.value` / `currentTarget.value` carry the new ISO string (empty when
 * cleared). The visible value is rendered as `dd/mm/yyyy`.
 */
export interface DatePickerProps {
  value?: string | number | readonly string[];
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-label"?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISO(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function parseISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatDisplay(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date | null, b: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/**
 * Clamp a date into the [min, max] range so the calendar opens on a month that
 * actually contains selectable days. Matters most for date-of-birth fields,
 * where `max` is ~18 years ago and today's month would be entirely disabled.
 */
function clampToRange(d: Date, min: Date | null, max: Date | null) {
  if (min && d < startOfDay(min)) return startOfDay(min);
  if (max && d > startOfDay(max)) return startOfDay(max);
  return d;
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  { value, onChange, min, max, disabled, placeholder = "dd/mm/yyyy", className, id, name, ...aria },
  ref
) {
  const iso = value == null ? "" : String(value);
  const minDate = min != null ? parseISO(String(min)) : null;
  const maxDate = max != null ? parseISO(String(max)) : null;
  const selected = parseISO(iso);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"days" | "months" | "years">("days");
  // The month currently shown in the grid (first of month). With no value yet,
  // open on the latest selectable month rather than today (key for DOB).
  const [view, setView] = React.useState<Date>(() => startOfDay(selected ?? clampToRange(new Date(), minDate, maxDate)));
  const [coords, setCoords] = React.useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popRef = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

  // Keep the visible month in sync with the selected value when it changes externally.
  React.useEffect(() => {
    if (selected) setView(startOfDay(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  const emit = React.useCallback(
    (next: string) => {
      const target = { value: next, name: name ?? "", type: "date" } as unknown as HTMLInputElement;
      onChange?.({ target, currentTarget: target } as unknown as React.ChangeEvent<HTMLInputElement>);
    },
    [onChange, name]
  );

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 300;
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    // Use the real popover height once it's mounted; fall back to an estimate
    // for the very first placement (before the element exists).
    const popH = popRef.current?.offsetHeight || 340;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    if (spaceBelow < popH + 8 && spaceAbove > spaceBelow) {
      // Not enough room below: open upward, anchoring the bottom edge just
      // above the trigger so it stays attached regardless of its height.
      setCoords({ bottom: window.innerHeight - r.top + 6, left, width });
    } else {
      setCoords({ top: r.bottom + 6, left, width });
    }
  }, []);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    setMode("days");
    setView(startOfDay(selected ?? clampToRange(new Date(), minDate, maxDate)));
    place();
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, place, iso, min, max]);

  // Re-measure once the popover is mounted so the flip decision uses its real
  // height (avoids the "floating with a gap" placement). Runs before paint.
  React.useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Reposition on scroll/resize while open; close on outside click / Escape.
  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, place]);

  const isDisabledDay = (d: Date) => {
    if (minDate && d < startOfDay(minDate)) return true;
    if (maxDate && d > startOfDay(maxDate)) return true;
    return false;
  };

  const pick = (d: Date) => {
    if (isDisabledDay(d)) return;
    emit(toISO(d.getFullYear(), d.getMonth(), d.getDate()));
    setOpen(false);
  };

  // Build the 6x7 day grid for the current view month.
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const days = Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - firstDow + i));
  const today = startOfDay(new Date());

  const popover = open && coords && (
    <div
      ref={popRef}
      role="dialog"
      aria-label="Choose date"
      style={{ position: "fixed", top: coords.top, bottom: coords.bottom, left: coords.left, width: coords.width, zIndex: 100 }}
      className="rounded-xl border border-border bg-surface-elevated p-3 shadow-2xl shadow-black/30 animate-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode(mode === "days" ? "months" : "days")}
          className="px-2 py-1 -ml-1 rounded-md text-sm font-semibold text-foreground hover:bg-surface-sunken transition-colors"
        >
          {mode === "years" ? `${year - 6} – ${year + 5}` : mode === "months" ? year : `${MONTHS[month]} ${year}`}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous"
            onClick={() =>
              setView(mode === "years" ? new Date(year - 12, month, 1) : mode === "months" ? new Date(year - 1, month, 1) : new Date(year, month - 1, 1))
            }
            className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() =>
              setView(mode === "years" ? new Date(year + 12, month, 1) : mode === "months" ? new Date(year + 1, month, 1) : new Date(year, month + 1, 1))
            }
            className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-surface-sunken hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Days mode */}
      {mode === "days" && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="h-7 grid place-items-center text-[11px] font-medium text-subtle-foreground">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === month;
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const off = isDisabledDay(d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={off}
                  onClick={() => pick(d)}
                  className={cn(
                    "h-9 w-9 mx-auto grid place-items-center rounded-md text-sm tabular-nums transition-colors",
                    off && "text-subtle-foreground/40 cursor-not-allowed",
                    !off && !isSel && inMonth && "text-foreground hover:bg-surface-sunken",
                    !off && !isSel && !inMonth && "text-subtle-foreground hover:bg-surface-sunken",
                    isSel && "bg-brand text-brand-foreground font-semibold hover:bg-brand",
                    !isSel && isToday && "ring-1 ring-inset ring-brand/50 font-semibold"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Months mode */}
      {mode === "months" && (
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((mname, mi) => (
            <button
              key={mname}
              type="button"
              onClick={() => {
                setView(new Date(year, mi, 1));
                setMode("days");
              }}
              className={cn(
                "h-10 rounded-md text-sm transition-colors",
                mi === month ? "bg-brand text-brand-foreground font-semibold" : "text-foreground hover:bg-surface-sunken"
              )}
            >
              {mname.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Years mode */}
      {mode === "years" && (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => year - 6 + i).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                setView(new Date(y, month, 1));
                setMode("months");
              }}
              className={cn(
                "h-10 rounded-md text-sm tabular-nums transition-colors",
                y === (selected?.getFullYear() ?? -1) ? "bg-brand text-brand-foreground font-semibold" : "text-foreground hover:bg-surface-sunken"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => {
            emit("");
            setOpen(false);
          }}
          className="px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => pick(today)}
          disabled={isDisabledDay(today)}
          className="px-2 py-1 rounded-md text-xs font-medium text-brand hover:bg-brand-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        {...aria}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden text-left",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-ring ring-2 ring-ring/30",
          className
        )}
      >
        <span className={cn("truncate tabular-nums", !iso && "text-subtle-foreground")}>
          {formatDisplay(iso) || placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {name && <input type="hidden" name={name} value={iso} />}
      {typeof document !== "undefined" && popover ? createPortal(popover, document.body) : null}
    </>
  );
});
