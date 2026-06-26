"use client";
import * as React from "react";
import { ChevronDown, Globe, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COUNTRIES,
  parsePhone,
  composePhone,
  formatNationalAsYouType,
  type CountryCode,
} from "@/lib/phone";

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  /** "md" → h-10 (default, matches Input), "sm" → h-9 for compact dialogs. */
  size?: "sm" | "md";
  onBlur?: () => void;
}

/**
 * Professional phone field: pick a country (searchable, flag + dial code), then
 * type the national number — validated against that country's real length via
 * libphonenumber-js. No default country: the number field is disabled until one
 * is chosen. `onChange` emits the international string ("+91 98765 43210"); an
 * existing value is parsed on mount so edit/prefill auto-selects the country.
 */
export function PhoneInput({
  value,
  onChange,
  invalid,
  disabled,
  id,
  name,
  placeholder,
  className,
  size = "md",
  onBlur,
}: PhoneInputProps) {
  const [country, setCountry] = React.useState<CountryCode | undefined>(undefined);
  const [national, setNational] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const numberRef = React.useRef<HTMLInputElement>(null);
  // The last value WE emitted — lets us ignore the echo and only re-parse on a
  // genuinely external value change (edit/prefill/reset).
  const lastEmitted = React.useRef<string>("");

  React.useEffect(() => {
    if (value === lastEmitted.current) return;
    const parsed = parsePhone(value);
    setCountry(parsed.country);
    setNational(
      parsed.country
        ? formatNationalAsYouType(parsed.country, parsed.nationalNumber)
        : parsed.nationalNumber,
    );
    lastEmitted.current = value;
  }, [value]);

  const emit = (c: CountryCode | undefined, nat: string) => {
    const out = c ? composePhone(c, nat) : "";
    lastEmitted.current = out;
    onChange(out);
  };

  const pickCountry = (c: CountryCode) => {
    setCountry(c);
    setOpen(false);
    setQuery("");
    emit(c, national);
    requestAnimationFrame(() => numberRef.current?.focus());
  };

  const onNationalChange = (raw: string) => {
    const formatted = country
      ? formatNationalAsYouType(country, raw)
      : raw.replace(/[^\d\s()-]/g, "");
    setNational(formatted);
    emit(country, formatted);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = country ? COUNTRIES.find(c => c.code === country) : undefined;
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const qDigits = q.replace(/[^\d+]/g, "");
    return COUNTRIES.filter(
      c => c.name.toLowerCase().includes(q) || (qDigits && c.dialCode.includes(qDigits)),
    );
  }, [query]);

  const h = size === "sm" ? "h-9" : "h-10";

  return (
    <div ref={rootRef} className={cn("relative flex", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-invalid={invalid}
        className={cn(
          "flex items-center gap-1.5 rounded-l-md border border-r-0 border-border bg-surface-sunken px-2.5 text-sm shrink-0",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-hidden",
          "disabled:cursor-not-allowed disabled:opacity-50",
          h,
          invalid && "border-danger",
        )}
      >
        {selected ? (
          <>
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="tabular text-muted-foreground">{selected.dialCode}</span>
          </>
        ) : (
          <>
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Code</span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <input
        ref={numberRef}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        disabled={disabled || !country}
        value={national}
        onChange={e => onNationalChange(e.target.value)}
        onBlur={onBlur}
        placeholder={country ? (placeholder ?? "Phone number") : "Select country first"}
        aria-invalid={invalid}
        className={cn(
          "flex-1 min-w-0 rounded-r-md border border-border bg-surface px-3 py-2 text-sm tabular outline-hidden",
          "placeholder:text-subtle-foreground",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          h,
          invalid && "border-danger focus-visible:border-danger focus-visible:ring-danger/30",
        )}
      />

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-md border border-border bg-surface shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search country or +code"
                className="h-8 w-full bg-transparent text-sm outline-hidden placeholder:text-subtle-foreground"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No match</li>
            )}
            {filtered.map(c => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => pickCountry(c.code)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-left hover:bg-surface-sunken",
                    c.code === country && "bg-surface-sunken",
                  )}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular text-muted-foreground">{c.dialCode}</span>
                  {c.code === country && <Check className="h-3.5 w-3.5 text-brand" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
