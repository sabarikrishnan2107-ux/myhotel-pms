import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  AsYouType,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

export interface Country {
  code: CountryCode;
  name: string;
  dialCode: string; // e.g. "+91"
  flag: string; // emoji
}

/** ISO-3166 alpha-2 code → regional-indicator flag emoji (🇮🇳 from "IN"). */
export function flagFor(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

/** All dialable countries, with display name + dial code + flag, sorted by name. */
export const COUNTRIES: Country[] = getCountries()
  .map(code => ({
    code,
    name: regionNames?.of(code) ?? code,
    dialCode: `+${getCountryCallingCode(code)}`,
    flag: flagFor(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** True when the value is a valid (correct-length) number for its own country code. */
export function isValidPhone(value: string): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  try {
    return isValidPhoneNumber(v);
  } catch {
    return false;
  }
}

/** International display format ("+91 98765 43210") when parseable; otherwise the input unchanged. */
export function formatPhone(value: string): string {
  const v = (value ?? "").trim();
  const parsed = parsePhoneNumberFromString(v);
  return parsed ? parsed.formatInternational() : value;
}

/**
 * Best-effort split of an existing value into its country + national digits, for
 * pre-filling the input in edit/prefill flows. Unparseable input keeps its raw
 * digits as the national part with no country, so nothing is silently dropped.
 */
export function parsePhone(value: string): { country?: CountryCode; nationalNumber: string } {
  const v = (value ?? "").trim();
  if (!v) return { nationalNumber: "" };
  const parsed = parsePhoneNumberFromString(v);
  if (parsed) return { country: parsed.country, nationalNumber: parsed.nationalNumber };
  return { nationalNumber: v.replace(/[^\d]/g, "") };
}

/**
 * Compose the international value emitted by the input from a selected country +
 * the digits typed into the national field. Returns "" when there are no digits.
 */
export function composePhone(country: CountryCode, national: string): string {
  const digits = (national ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, country);
  return parsed ? parsed.formatInternational() : `+${getCountryCallingCode(country)} ${digits}`;
}

/** As-you-type national formatting for a given country (no country prefix). */
export function formatNationalAsYouType(country: CountryCode, national: string): string {
  const digits = (national ?? "").replace(/[^\d]/g, "");
  return new AsYouType(country).input(digits);
}
