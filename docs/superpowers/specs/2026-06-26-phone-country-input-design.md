# Professional country-code phone input — design

**Date:** 2026-06-26
**Status:** Approved (rebased onto `feat/phone-country-input`, stacked on the walk-in-sync work)

## Problem

Phone fields across the app are plain text inputs seeded with a literal
`"+91 "` string and validated by a generic "8–15 digits" rule. Staff get no
country picker, and a number that is the wrong length for its country (e.g. a
9-digit Indian mobile) still passes. We want a professional input: pick a
country, then the number is validated against *that country's* real rules.

## Decisions (agreed)

- **Scope:** every place a phone number is *typed* (~18 sites), via one reusable
  component. Not mock/display data.
- **Default country:** none — the user must pick. (Existing numbers loaded for
  edit/prefill auto-infer their country.)
- **Strictness:** block save until the number is valid for the chosen country.
- **Rollout:** build the component, then convert all sites in one pass.

## Approach

Use **`libphonenumber-js`** (~75 KB, fully offline, the maintained port of
Google's libphonenumber) for validation, parsing, and as-you-type formatting.
It is the only credible source of accurate per-country length rules. Country
**names** come from the browser-built-in `Intl.DisplayNames` and **flags** from
the ISO-3166 code → regional-indicator emoji, so no country dataset is bundled.

Rejected alternatives:
- `react-phone-number-input` — ships its own CSS that fights the custom Tailwind
  dark theme; harder to match the design system.
- Hand-maintained country→digit-count table — inaccurate (many countries have
  several valid lengths) and high-maintenance.

## Components

### `src/lib/phone.ts` — pure helper (no React)
- `COUNTRIES: { code: CountryCode; name: string; dialCode: string; flag: string }[]`
  built once from `getCountries()` + `getCountryCallingCode()`, sorted by name.
- `parsePhone(value): { country?: CountryCode; nationalNumber: string }` — best
  effort parse of an existing string for edit/prefill.
- `formatPhone(value): string` — international format (`+91 98765 43210`) when
  parseable, else the input unchanged.
- `isValidPhone(value): boolean` — true when the number is a valid length for its
  country (via `isValidPhoneNumber`).
- `phoneExampleFor(country): string` — a sample number for the error hint.
- `flagFor(code)` / `dialCodeFor(code)` helpers as needed.

### `src/components/ui/phone-input.tsx` — controlled component
- Props: `value: string`, `onChange(value: string)`, plus `required?`,
  `invalid?`, `id`, `name`, `placeholder?`, `className?`, `disabled?`.
- Layout: a country button (flag + `+code`) on the left opening a **searchable**
  dropdown (filter by country name or `+code`); the national-number `<input>` on
  the right with `AsYouType` formatting. Styled with existing theme tokens
  (`surface`, `border`, `ring`, `danger`, `muted-foreground`) to match `Input`.
- **No default:** opens with a 🌐 "Select country" placeholder and the number
  field disabled until a country is chosen. On mount, if `value` is non-empty it
  is parsed and the country pre-selected (edit/prefill case).
- `onChange` emits the international-format string so existing tables/displays
  that render the stored value keep working.

## Validation & save-gating

`isValidPhone` checks length-for-country. Error copy: "Enter a valid {Country}
number".

- **Required** sites (`Phone *`): save is disabled until valid — wired into each
  form's existing gating. The guest form already follows this pattern
  (`phoneValid` → `requiredOk`); the others get the same treatment on their save
  button / dialog-confirm.
- **Optional** sites: empty is allowed; a typed value must still be valid for its
  country before save.

## Sites to convert (~18)

Required (`Phone *`): guest `new-guest-form`, `guests` quick-add, `loyalty`
member, `agents`, `staff`, `enquiries`, `halls/new`, `groups/new`, `checkin`
(walk-in), `users`.
Optional: `groups/[id]` contact, `vendors`, `inventory` vendor, `maintenance`
AMC, `fb/tables` reservation, `revenue/group-quote`, `checkout/express`
(prefilled), `notifications/templates` test-send.

Each conversion replaces the raw `<Input>`, removes the `"+91 "` seed string and
ad-hoc `type="tel"`/placeholder, and routes validity into the existing save gate.

## Error handling & edge cases

- Empty value on an optional field → valid (no error shown).
- Pristine required field → no red until blurred/touched.
- Unparseable legacy value loaded for edit → country stays unpicked, raw text
  preserved in the number field so nothing is silently dropped.
- Pasting a full `+<code>…` number → country auto-switches to match.

## Testing

- `lib/phone.ts` unit tests (vitest): valid IN/US/UK/AE numbers accepted;
  wrong-length rejected; `parsePhone` round-trips `formatPhone`; empty handled.
- Manual: run the app, open the guest form, confirm picker + per-country
  validation + save-gating, then spot-check 2–3 other converted sites.

## Out of scope

- Reformatting phone numbers already stored in the DB/mock data.
- Backend phone validation (Laravel) — this is a frontend-input change.
- The `owner` recipient field (accepts email *or* phone) stays a plain input.
