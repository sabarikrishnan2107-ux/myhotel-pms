// Use the FULL ("max") metadata so validation checks each country's real
// national patterns (correct length AND valid prefixes) — the default "min"
// metadata only checks possible length, which wrongly accepts e.g. an 8-digit
// Indian number. Importing every helper from /max keeps a single metadata set.
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  getExampleNumber,
  AsYouType,
  type CountryCode,
} from "libphonenumber-js/max";
import examples from "libphonenumber-js/examples.mobile.json";

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

const exampleCache = new Map<CountryCode, { placeholder: string; maxDigits: number }>();

/**
 * A representative mobile number for a country: a formatted national-format
 * `placeholder` (e.g. India → "98765 43210") and `maxDigits`, the number of
 * national digits a valid number has (India → 10), used to cap typing.
 */
export function phoneExample(country: CountryCode): { placeholder: string; maxDigits: number } {
  const cached = exampleCache.get(country);
  if (cached) return cached;
  const ex = getExampleNumber(country, examples);
  const result = ex
    ? { placeholder: formatNationalAsYouType(country, ex.nationalNumber), maxDigits: ex.nationalNumber.length }
    : { placeholder: "Phone number", maxDigits: 15 };
  exampleCache.set(country, result);
  return result;
}
