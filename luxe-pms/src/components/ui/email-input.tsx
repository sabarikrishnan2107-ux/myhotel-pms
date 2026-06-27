"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { isValidEmail } from "@/lib/email";

export interface EmailInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  /** Emits the raw string value (matches PhoneInput's onChange shape). */
  onChange: (value: string) => void;
  /** Flag the error before blur, too. Default: only after the field is touched. */
  eager?: boolean;
  /** Keep the red border but suppress the inline error <p> — for tight inline rows. */
  hideError?: boolean;
  /** Class for the wrapping element (the <input> gets `className`). */
  wrapperClassName?: string;
}

// Same "invalid field" styling the booking form uses, so email errors look
// identical to the phone / DOB ones everywhere.
const DANGER = "border-danger focus-visible:border-danger focus-visible:ring-danger/30";

/**
 * Email field with built-in format validation, matching the booking form: once
 * the field is touched (blurred), a non-empty value that isn't a valid address
 * shows a red border and an inline hint. Empty is allowed — callers that require
 * an email gate presence separately. `value`/`onChange` are controlled (string).
 */
export function EmailInput({
  value, onChange, eager, hideError, wrapperClassName, className, onBlur, placeholder, ...props
}: EmailInputProps) {
  const [touched, setTouched] = React.useState(false);
  const show = !isValidEmail(value) && (eager || touched);
  return (
    <div className={wrapperClassName}>
      <Input
        {...props}
        type="email"
        inputMode="email"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={e => { setTouched(true); onBlur?.(e); }}
        placeholder={placeholder ?? "guest@example.com"}
        aria-invalid={show || undefined}
        className={cn(show && DANGER, className)}
      />
      {show && !hideError && (
        <p className="text-[11px] text-danger mt-1">Enter a valid email address (e.g. guest@example.com)</p>
      )}
    </div>
  );
}
