import * as React from "react";
import { cn } from "@/lib/utils";
import { DatePicker } from "./date-picker";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    // Use the styled, theme-aware calendar instead of the browser's native
    // date control (which can't be styled to match the dark theme).
    if (type === "date") {
      const { value, onChange, min, max, disabled, placeholder, id, name } = props;
      return (
        <DatePicker
          className={className}
          value={value}
          onChange={onChange}
          min={min as string | number | undefined}
          max={max as string | number | undefined}
          disabled={disabled}
          placeholder={placeholder}
          id={id}
          name={name}
          aria-invalid={props["aria-invalid"]}
          aria-label={props["aria-label"]}
        />
      );
    }
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-hidden",
          "placeholder:text-subtle-foreground",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

/**
 * Numeric input bound to a `number` state that you can actually clear.
 *
 * A plain `<Input type="number" value={n} onChange={e => set(Number(e.target.value))} />`
 * snaps an empty field back to `0` (because `Number("") === 0`), so a leading `0`
 * can never be deleted. This keeps a string draft while the field is focused —
 * so you can empty it, type decimals, etc. — and only normalises to a number on
 * change/blur. A value of `0` shows as an empty field with a `0` placeholder.
 */
interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onChange: (value: number) => void;
}

export function NumberInput({ value, onChange, placeholder = "0", onFocus, onBlur, ...props }: NumberInputProps) {
  const toDraft = (n: number) => (n === 0 ? "" : String(n));
  // `draft` is null when not editing: the field then derives its text straight
  // from `value`. While editing it holds the raw string so it can be emptied.
  const [draft, setDraft] = React.useState<string | null>(null);
  const displayed = draft ?? toDraft(value);

  return (
    <Input
      {...props}
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      value={displayed}
      onFocus={e => { setDraft(toDraft(value)); onFocus?.(e); }}
      onBlur={e => {
        const n = draft && !Number.isNaN(Number(draft)) ? Number(draft) : 0;
        setDraft(null);
        onChange(n);
        onBlur?.(e);
      }}
      onChange={e => {
        const raw = e.target.value;
        setDraft(raw);
        const n = raw === "" ? 0 : Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn("text-sm font-medium text-foreground", className)} {...props} />
  )
);
Label.displayName = "Label";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-surface px-3 text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
