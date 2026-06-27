// Single source of truth for email-address validation across the app.
// Mirrors the original booking-form check so every email field flags the same way.

// "something@something.tld" with no spaces. Deliberately lenient — we reject
// obvious garbage (no @, no domain dot, stray spaces), not exotic-but-valid RFC
// addresses, which would frustrate real guests at the front desk.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email is treated as optional: an empty value is valid. A non-empty value must
 * look like an address. Forms that *require* an email enforce presence on top of
 * this (e.g. `name && isValidEmail(email) && email !== ""`).
 */
export function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t === "" || EMAIL_RE.test(t);
}
