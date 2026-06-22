# Per-hotel SMTP configuration + real sending

**Date:** 2026-06-22
**Scope:** Backend (Laravel) + frontend (the Integrations config modal). Lets a hotel enter
their own SMTP credentials and have the app actually send mail through them.

## Goal

In Setup → Integrations → **SMTP (Amazon SES)**, replace the generic
endpoint/API-key fields with real SMTP fields (host, port, encryption, from name, from
email, username, password). Save them (password encrypted at rest), test the connection,
and route the app's outgoing email through the hotel's own SMTP when configured.

## Current state

- `EmailController::send` (`/email/send`) and the invoice/hall mailers send via Laravel
  `Mail`, which reads `.env MAIL_*` (default mailer `log`).
- Settings persist via the generic `SettingsController` `/settings/{key}` (one JSON blob per
  key) — but it stores `$request->all()` verbatim, i.e. plaintext. Not acceptable for a
  password.
- The `IntegrationConfigModal` shows generic fields (endpoint / API key / secret) for every
  integration and does **not** persist them.

## Design

### Backend

**1. Storage + dedicated controller (`SmtpSettingsController`).**
Store under the existing `app_settings` row keyed `smtp` (reuse `AppSetting`), but through a
dedicated controller so the password is encrypted and never leaked:
- `GET /settings/smtp` → returns `{ host, port, encryption, fromName, fromEmail, username,
  enabled, hasPassword }` — **password omitted**; `hasPassword` indicates one is stored.
- `PUT /settings/smtp` → validates and saves. Password handling: if a non-empty `password`
  is sent, `Crypt::encryptString` it and store; if `password` is omitted/blank, keep the
  existing stored value (so re-saving other fields doesn't wipe it).
- `POST /settings/smtp/test` → builds a Symfony SMTP transport from the **submitted** creds
  (falling back to the stored password when blank) and attempts to send a small test email
  to a provided `to` (or the `fromEmail`); returns `{ ok: true }` or `{ ok: false, error }`.

Register these three routes **before** the generic `/settings/{key}` routes so `smtp` is
special-cased (generic route order otherwise captures it).

Validation (`PUT`/`test`): `host` string, `port` integer 1–65535, `encryption` in
`tls|ssl|none`, `fromEmail` email, `fromName` string, `username` string, `password` string
nullable, `enabled` boolean.

**2. Runtime mailer override (`ConfigureMailFromSettings` middleware).**
A middleware applied to the email-sending routes (`/email/send`, `/email/invoice`,
`/hall-bookings/{id}/send-email`). Before the request runs, it loads the `smtp` setting; if
`enabled` and complete, it sets at runtime:
`config(['mail.default' => 'smtp', 'mail.mailers.smtp.{host,port,username,password,encryption}', 'mail.from.address' => fromEmail, 'mail.from.name' => fromName])`
(decrypting the password), then `Mail::purge('smtp')` so the new config takes effect. When
not configured/enabled, it does nothing → falls back to `.env` (existing behavior). This
keeps **all** existing send paths working with the hotel's SMTP, no per-controller changes.

Security: password encrypted at rest (`Crypt`, app key), never returned by `GET`, only
decrypted in-memory at send/test time.

### Frontend

**Special-case the SMTP integration in `IntegrationConfigModal`.**
When `integration.category === "Email"` (the SMTP one), render SMTP fields instead of the
generic endpoint/key/secret set:
- Host, Port (number), Encryption (`Select`: TLS / SSL / None), From name, From email,
  Username, Password (`type=password` with show/hide).
- On open: `apiGet('/settings/smtp')` to prefill; password shows a masked placeholder when
  `hasPassword` (left blank means "unchanged").
- **Save**: `apiPut('/settings/smtp', {...})` (only include `password` if the user typed
  one), then mark the integration connected/live (existing behavior).
- **Test connection**: `apiPost('/settings/smtp/test', {...})` → toast success/failure with
  the returned message.

Non-Email integrations keep the existing generic fields unchanged.

## Out of scope (YAGNI)

- Persisting config for the other (non-SMTP) integrations — unchanged.
- Per-property multi-tenant separation beyond the single `smtp` settings row (the app is
  single-property today).
- OAuth/XOAUTH2, DKIM setup, bounce handling, send queues/retries.
- A full email-log UI (sends already write an audit-log entry).

## Testing

- Backend unit/feature: `PUT /settings/smtp` encrypts the password and `GET` never returns
  it (`hasPassword` true); re-`PUT` without a password keeps the stored one; `test` returns
  a structured ok/error.
- Backend: with `smtp.enabled`, the middleware sets `config('mail.default')` to `smtp` and
  the from address; without it, config is untouched.
- Manual/browser: open the SMTP integration, enter creds, Test connection, Save; reload →
  fields persist (password masked); send a real email (e.g. a booking confirmation) and
  confirm it goes through the configured SMTP.
