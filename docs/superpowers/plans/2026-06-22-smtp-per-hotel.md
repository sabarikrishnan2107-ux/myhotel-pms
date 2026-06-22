# Per-hotel SMTP Configuration + Real Sending — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a hotel enter their own SMTP credentials in Setup → Integrations → SMTP, store them encrypted, test the connection, and route all outgoing app email through them.

**Architecture:** A `SmtpConfig` support class centralizes loading stored SMTP settings (decrypting the password) and applying them to Laravel's runtime mail config. A dedicated `SmtpSettingsController` persists settings (password encrypted, never returned) and tests the connection. A `ConfigureMailFromSettings` middleware on the email routes applies the hotel's SMTP per request (falling back to `.env`). The frontend special-cases the Email integration in the existing config modal.

**Tech Stack:** Laravel 11 + Postgres (PHPUnit feature tests), Next.js 16 / React 19 / TypeScript frontend.

## Global Constraints

- Backend dir `hotel-pms-api/`; frontend dir `luxe-pms/`. Run backend artisan/phpunit with `C:/php84/php.exe` (herd-lite PHP lacks pgsql). Run frontend `npm` from `luxe-pms/`.
- Settings live in the `app_settings` table via the `AppSetting` model (`value` cast to `array`), key `smtp`.
- Password MUST be encrypted at rest (`Illuminate\Support\Facades\Crypt`), never returned by `GET`, and preserved on save when the client sends a blank password.
- `encryption` is one of `tls | ssl | none` (`none` → no transport encryption).
- All API routes are inside the `auth:sanctum` group in `routes/api.php`. Feature tests authenticate with `$this->actingAs(User::factory()->create(), 'sanctum')` and use `RefreshDatabase`.
- Frontend reuses `apiGet`, `apiPut`, `apiPost` from `@/lib/api`; no new deps. UI verified via `npm run lint` + `npm run build` (no React component test harness).

---

### Task 1: SmtpConfig support class + SmtpSettingsController (show/update) + routes

**Files:**
- Create: `hotel-pms-api/app/Support/SmtpConfig.php`
- Create: `hotel-pms-api/app/Http/Controllers/Api/SmtpSettingsController.php`
- Modify: `hotel-pms-api/routes/api.php`
- Test: `hotel-pms-api/tests/Feature/SmtpSettingsTest.php`

**Interfaces:**
- Consumes: `App\Models\AppSetting`.
- Produces:
  - `SmtpConfig::stored(): ?array` — decrypted config array or null when not enabled/complete.
  - `SmtpConfig::apply(array $cfg): void` — sets runtime `config('mail.*')` and `Mail::purge('smtp')`.
  - `SmtpConfig::decrypt(?string $enc): ?string` — decrypts; `''` for empty input; `null` on failure.
  - `GET /settings/smtp` (show) and `PUT /settings/smtp` (update).

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/SmtpSettingsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class SmtpSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function validPayload(array $over = []): array
    {
        return array_merge([
            'host' => 'smtp.example.com', 'port' => 587, 'encryption' => 'tls',
            'username' => 'apikey', 'password' => 'super-secret', 'fromName' => 'The Pearl',
            'fromEmail' => 'hello@thepearl.in', 'enabled' => true,
        ], $over);
    }

    public function test_put_encrypts_password_and_get_never_returns_it(): void
    {
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload())->assertOk();

        $stored = AppSetting::where('key', 'smtp')->first()->value;
        $this->assertNotEquals('super-secret', $stored['password']); // encrypted
        $this->assertEquals('super-secret', Crypt::decryptString($stored['password']));

        $this->getJson('/api/settings/smtp')
            ->assertOk()
            ->assertJsonMissingPath('password')
            ->assertJsonPath('hasPassword', true)
            ->assertJsonPath('host', 'smtp.example.com')
            ->assertJsonPath('enabled', true);
    }

    public function test_put_without_password_keeps_the_existing_one(): void
    {
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload())->assertOk();
        // Re-save with a blank password (e.g. user only changed the port).
        $this->putJson('/api/settings/smtp', $this->validPayload(['password' => '', 'port' => 465, 'encryption' => 'ssl']))->assertOk();

        $stored = AppSetting::where('key', 'smtp')->first()->value;
        $this->assertEquals('super-secret', Crypt::decryptString($stored['password']));
        $this->assertEquals(465, $stored['port']);
    }

    public function test_put_validates_input(): void
    {
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload(['fromEmail' => 'not-an-email', 'encryption' => 'weird']))
            ->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=SmtpSettingsTest`
Expected: FAIL — 404/route-not-found (endpoints don't exist yet).

- [ ] **Step 3: Create the `SmtpConfig` support class**

Create `hotel-pms-api/app/Support/SmtpConfig.php`:

```php
<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;

/**
 * Loads the stored per-hotel SMTP settings and applies them to Laravel's
 * runtime mail config so outgoing email uses the hotel's own mailbox.
 */
class SmtpConfig
{
    /** Decrypted, usable config — or null when SMTP is disabled/incomplete. */
    public static function stored(): ?array
    {
        $v = AppSetting::where('key', 'smtp')->first()?->value ?? [];
        if (empty($v['enabled'])) {
            return null;
        }
        $password = self::decrypt($v['password'] ?? null);
        if (empty($v['host']) || empty($v['fromEmail']) || empty($password)) {
            return null;
        }

        return [
            'host'       => (string) $v['host'],
            'port'       => (int) ($v['port'] ?? 587),
            'username'   => (string) ($v['username'] ?? ''),
            'password'   => $password,
            'encryption' => (string) ($v['encryption'] ?? 'tls'),
            'fromName'   => (string) ($v['fromName'] ?? ''),
            'fromEmail'  => (string) $v['fromEmail'],
        ];
    }

    /** Apply a decrypted config array to the runtime mail config. */
    public static function apply(array $cfg): void
    {
        config([
            'mail.default'                 => 'smtp',
            'mail.mailers.smtp.transport'  => 'smtp',
            'mail.mailers.smtp.url'        => null,
            'mail.mailers.smtp.host'       => $cfg['host'],
            'mail.mailers.smtp.port'       => $cfg['port'],
            'mail.mailers.smtp.username'   => $cfg['username'] !== '' ? $cfg['username'] : null,
            'mail.mailers.smtp.password'   => $cfg['password'] !== '' ? $cfg['password'] : null,
            'mail.mailers.smtp.encryption' => $cfg['encryption'] === 'none' ? null : $cfg['encryption'],
            'mail.from.address'            => $cfg['fromEmail'],
            'mail.from.name'               => $cfg['fromName'] !== '' ? $cfg['fromName'] : $cfg['fromEmail'],
        ]);
        Mail::purge('smtp');
    }

    /** Decrypt a stored value: '' for empty input, null if it can't be decrypted. */
    public static function decrypt(?string $enc): ?string
    {
        if ($enc === null || $enc === '') {
            return '';
        }
        try {
            return Crypt::decryptString($enc);
        } catch (\Throwable) {
            return null;
        }
    }
}
```

- [ ] **Step 4: Create the controller (show + update)**

Create `hotel-pms-api/app/Http/Controllers/Api/SmtpSettingsController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Support\SmtpConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;

class SmtpSettingsController extends Controller
{
    private function rules(): array
    {
        return [
            'host'       => 'required|string|max:255',
            'port'       => 'required|integer|min:1|max:65535',
            'encryption' => 'required|in:tls,ssl,none',
            'username'   => 'nullable|string|max:255',
            'password'   => 'nullable|string|max:500',
            'fromName'   => 'nullable|string|max:255',
            'fromEmail'  => 'required|email|max:255',
            'enabled'    => 'boolean',
        ];
    }

    public function show()
    {
        $v = AppSetting::where('key', 'smtp')->first()?->value ?? [];

        return response()->json([
            'host'        => $v['host'] ?? '',
            'port'        => $v['port'] ?? 587,
            'encryption'  => $v['encryption'] ?? 'tls',
            'username'    => $v['username'] ?? '',
            'fromName'    => $v['fromName'] ?? '',
            'fromEmail'   => $v['fromEmail'] ?? '',
            'enabled'     => (bool) ($v['enabled'] ?? false),
            'hasPassword' => ! empty($v['password']),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate($this->rules());
        $row = AppSetting::firstOrCreate(['key' => 'smtp'], ['value' => []]);
        $existing = $row->value ?? [];

        $value = [
            'host'       => $data['host'],
            'port'       => (int) $data['port'],
            'encryption' => $data['encryption'],
            'username'   => $data['username'] ?? '',
            'fromName'   => $data['fromName'] ?? '',
            'fromEmail'  => $data['fromEmail'],
            'enabled'    => (bool) ($data['enabled'] ?? false),
            'password'   => $existing['password'] ?? null, // keep unless replaced below
        ];
        if (! empty($data['password'])) {
            $value['password'] = Crypt::encryptString($data['password']);
        }

        $row->value = $value;
        $row->save();

        return $this->show();
    }

    public function test(Request $request)
    {
        $data = $request->validate($this->rules() + ['to' => 'nullable|email']);

        $password = $data['password'] ?? '';
        if ($password === '') {
            $stored = AppSetting::where('key', 'smtp')->first()?->value ?? [];
            $password = SmtpConfig::decrypt($stored['password'] ?? null) ?? '';
        }

        SmtpConfig::apply([
            'host'       => $data['host'],
            'port'       => (int) $data['port'],
            'username'   => $data['username'] ?? '',
            'password'   => $password,
            'encryption' => $data['encryption'],
            'fromName'   => $data['fromName'] ?? '',
            'fromEmail'  => $data['fromEmail'],
        ]);

        $to = $data['to'] ?? $data['fromEmail'];
        try {
            Mail::mailer('smtp')->raw('SMTP test from your PMS — your mail settings work. ✓', function ($m) use ($to) {
                $m->to($to)->subject('PMS SMTP test');
            });

            return response()->json(['ok' => true, 'to' => $to]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()]);
        }
    }
}
```

- [ ] **Step 5: Register the routes (before the generic `/settings/{key}`)**

In `hotel-pms-api/routes/api.php`, add the import near the other `use App\Http\Controllers\Api\...` lines:

```php
use App\Http\Controllers\Api\SmtpSettingsController;
```

Then, immediately ABOVE the existing `// Single-row settings sections (JSON by key)` block, add:

```php
    // SMTP settings — dedicated controller so the password is encrypted at rest
    // and never returned. Registered before the generic /settings/{key} routes.
    Route::get('/settings/smtp', [SmtpSettingsController::class, 'show']);
    Route::put('/settings/smtp', [SmtpSettingsController::class, 'update']);
    Route::post('/settings/smtp/test', [SmtpSettingsController::class, 'test']);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=SmtpSettingsTest`
Expected: PASS (3 tests: encrypt+get-omits, keep-existing, validation).

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/app/Support/SmtpConfig.php hotel-pms-api/app/Http/Controllers/Api/SmtpSettingsController.php hotel-pms-api/routes/api.php hotel-pms-api/tests/Feature/SmtpSettingsTest.php
git commit -m "feat(api): per-hotel SMTP settings (encrypted) + show/update endpoints"
```

---

### Task 2: Test-connection endpoint behavior

**Files:**
- Modify: `hotel-pms-api/tests/Feature/SmtpSettingsTest.php` (add tests; the `test()` method + route already exist from Task 1)

**Interfaces:**
- Consumes: `POST /settings/smtp/test` (added in Task 1), `SmtpConfig::apply`.
- Produces: verified `{ ok: bool, ... }` contract.

- [ ] **Step 1: Write the failing tests**

Append these methods to `hotel-pms-api/tests/Feature/SmtpSettingsTest.php` (inside the class):

```php
    public function test_test_endpoint_returns_ok_when_send_succeeds(): void
    {
        \Illuminate\Support\Facades\Mail::fake();
        $this->auth();

        $this->postJson('/api/settings/smtp/test', $this->validPayload(['to' => 'qa@thepearl.in']))
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('to', 'qa@thepearl.in');
    }

    public function test_test_endpoint_validates_input(): void
    {
        $this->auth();
        $this->postJson('/api/settings/smtp/test', ['host' => '', 'port' => 99999, 'encryption' => 'tls', 'fromEmail' => 'x'])
            ->assertStatus(422);
    }

    public function test_test_endpoint_falls_back_to_stored_password_when_blank(): void
    {
        \Illuminate\Support\Facades\Mail::fake();
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload())->assertOk();

        // No password in the test request → uses the stored (encrypted) one; still ok.
        $this->postJson('/api/settings/smtp/test', $this->validPayload(['password' => '']))
            ->assertOk()
            ->assertJsonPath('ok', true);
    }
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=SmtpSettingsTest`
Expected: PASS — the new tests pass against the `test()` method implemented in Task 1 (Mail::fake makes the send succeed without a real server). No production code change is needed; if a test fails, fix `test()` accordingly.

- [ ] **Step 3: Commit**

```bash
git add hotel-pms-api/tests/Feature/SmtpSettingsTest.php
git commit -m "test(api): cover SMTP test-connection endpoint (ok / validation / stored-password)"
```

---

### Task 3: ConfigureMailFromSettings middleware on the email routes

**Files:**
- Create: `hotel-pms-api/app/Http/Middleware/ConfigureMailFromSettings.php`
- Modify: `hotel-pms-api/routes/api.php`
- Test: `hotel-pms-api/tests/Feature/SmtpMiddlewareTest.php`

**Interfaces:**
- Consumes: `SmtpConfig::stored()`, `SmtpConfig::apply()`.
- Produces: the email routes run with the hotel's SMTP applied when enabled.

- [ ] **Step 1: Write the failing test**

Create `hotel-pms-api/tests/Feature/SmtpMiddlewareTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SmtpMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function enableSmtp(): void
    {
        AppSetting::create(['key' => 'smtp', 'value' => [
            'host' => 'smtp.hotel.test', 'port' => 587, 'encryption' => 'tls',
            'username' => 'apikey', 'password' => Crypt::encryptString('pw'),
            'fromName' => 'Pearl', 'fromEmail' => 'hello@pearl.test', 'enabled' => true,
        ]]);
    }

    private function emailPayload(): array
    {
        return ['to' => 'guest@example.com', 'subject' => 'Hi', 'heading' => 'Welcome'];
    }

    public function test_email_route_uses_hotel_smtp_when_enabled(): void
    {
        Mail::fake();
        $this->auth();
        $this->enableSmtp();

        $this->postJson('/api/email/send', $this->emailPayload())->assertOk();

        $this->assertEquals('smtp', config('mail.default'));
        $this->assertEquals('smtp.hotel.test', config('mail.mailers.smtp.host'));
        $this->assertEquals('hello@pearl.test', config('mail.from.address'));
    }

    public function test_email_route_untouched_when_smtp_disabled(): void
    {
        Mail::fake();
        $this->auth();
        // No smtp setting at all → middleware does nothing.
        $this->postJson('/api/email/send', $this->emailPayload())->assertOk();

        $this->assertNotEquals('smtp.hotel.test', config('mail.mailers.smtp.host'));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=SmtpMiddlewareTest`
Expected: FAIL — `config('mail.default')` is not `smtp` (middleware not applied yet).

- [ ] **Step 3: Create the middleware**

Create `hotel-pms-api/app/Http/Middleware/ConfigureMailFromSettings.php`:

```php
<?php

namespace App\Http\Middleware;

use App\Support\SmtpConfig;
use Closure;
use Illuminate\Http\Request;

/**
 * Applies the hotel's stored SMTP settings to the runtime mail config so the
 * request's outgoing email uses their own mailbox. No-op (falls back to .env)
 * when SMTP is not configured/enabled.
 */
class ConfigureMailFromSettings
{
    public function handle(Request $request, Closure $next)
    {
        $cfg = SmtpConfig::stored();
        if ($cfg !== null) {
            SmtpConfig::apply($cfg);
        }

        return $next($request);
    }
}
```

- [ ] **Step 4: Apply the middleware to the email routes**

In `hotel-pms-api/routes/api.php`, replace the three standalone email route lines:

```php
    Route::post('/email/send', [EmailController::class, 'send']);

    // Tax-invoice email with a generated PDF attachment (checkout "Email Invoice").
    Route::post('/email/invoice', [InvoiceMailController::class, 'send']);

    // Hall booking confirmation email (synchronous; uses the configured mail driver)
    Route::post('/hall-bookings/{id}/send-email', [HallBookingMailController::class, 'send']);
```

with a group wrapped in the middleware:

```php
    // All email-sending routes run through the hotel's configured SMTP when set.
    Route::middleware(\App\Http\Middleware\ConfigureMailFromSettings::class)->group(function () {
        Route::post('/email/send', [EmailController::class, 'send']);
        // Tax-invoice email with a generated PDF attachment (checkout "Email Invoice").
        Route::post('/email/invoice', [InvoiceMailController::class, 'send']);
        // Hall booking confirmation email (synchronous; uses the configured mail driver)
        Route::post('/hall-bookings/{id}/send-email', [HallBookingMailController::class, 'send']);
    });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `C:/php84/php.exe hotel-pms-api/artisan test --filter=SmtpMiddlewareTest`
Expected: PASS (both tests).

- [ ] **Step 6: Run the full backend suite (no regressions)**

Run: `C:/php84/php.exe hotel-pms-api/artisan test`
Expected: PASS (all tests green; confirms the route/middleware changes didn't break other endpoints).

- [ ] **Step 7: Commit**

```bash
git add hotel-pms-api/app/Http/Middleware/ConfigureMailFromSettings.php hotel-pms-api/routes/api.php hotel-pms-api/tests/Feature/SmtpMiddlewareTest.php
git commit -m "feat(api): route outgoing email through hotel SMTP via middleware"
```

---

### Task 4: Frontend — SMTP fields in the Integrations config modal

**Files:**
- Modify: `luxe-pms/src/app/(app)/setup/setup-view.tsx`

**Interfaces:**
- Consumes: `GET/PUT /settings/smtp`, `POST /settings/smtp/test` (Tasks 1–2); `apiGet`, `apiPut`, `apiPost` from `@/lib/api`.
- Produces: SMTP-specific config UI for the Email integration.

- [ ] **Step 1: Pass `onToast` into the config modal**

In `luxe-pms/src/app/(app)/setup/setup-view.tsx`, find where the modal is rendered (`{configFor && <IntegrationConfigModal integration={configFor} onClose={...} onSave={() => {`) and add an `onToast={onToast}` prop to the `<IntegrationConfigModal ... />` opening tag (alongside `integration`/`onClose`).

- [ ] **Step 2: Extend the modal signature + add SMTP state and handlers**

In `IntegrationConfigModal`, change the signature from:

```tsx
function IntegrationConfigModal({ integration, onClose, onSave, onTest }: {
  integration: Integration; onClose: () => void; onSave: () => void; onTest: () => void;
}) {
  const [endpoint, setEndpoint] = React.useState("https://api.example.com/v1");
  const [apiKey, setApiKey] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [syncFreq, setSyncFreq] = React.useState("Real-time");
```

to:

```tsx
function IntegrationConfigModal({ integration, onClose, onSave, onTest, onToast }: {
  integration: Integration; onClose: () => void; onSave: () => void; onTest: () => void; onToast: (m: string) => void;
}) {
  const isSmtp = integration.category === "Email";

  const [endpoint, setEndpoint] = React.useState("https://api.example.com/v1");
  const [apiKey, setApiKey] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [syncFreq, setSyncFreq] = React.useState("Real-time");

  // SMTP-specific state (only used when isSmtp).
  const [smtp, setSmtp] = React.useState({ host: "", port: 587, encryption: "tls", username: "", fromName: "", fromEmail: "", password: "", hasPassword: false });
  const [showSmtpPw, setShowSmtpPw] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!isSmtp) return;
    apiGet<typeof smtp & { enabled?: boolean }>("/settings/smtp")
      .then(v => setSmtp(s => ({ ...s, host: v.host ?? "", port: v.port ?? 587, encryption: v.encryption ?? "tls", username: v.username ?? "", fromName: v.fromName ?? "", fromEmail: v.fromEmail ?? "", password: "", hasPassword: !!v.hasPassword })))
      .catch(() => {});
  }, [isSmtp]);

  // Build the request body; omit password when left blank (keep existing server-side).
  const smtpBody = () => {
    const b: Record<string, unknown> = { host: smtp.host.trim(), port: Number(smtp.port) || 587, encryption: smtp.encryption, username: smtp.username.trim(), fromName: smtp.fromName.trim(), fromEmail: smtp.fromEmail.trim(), enabled: true };
    if (smtp.password) b.password = smtp.password;
    return b;
  };

  const saveSmtp = async () => {
    setBusy(true);
    try {
      await apiPut("/settings/smtp", smtpBody());
      onSave();
    } catch {
      onToast("⚠ Save failed — backend offline");
    } finally {
      setBusy(false);
    }
  };

  const testSmtp = async () => {
    setBusy(true);
    try {
      const r = await apiPost<{ ok: boolean; to?: string; error?: string }>("/settings/smtp/test", smtpBody());
      onToast(r.ok ? `SMTP test ok — sent to ${r.to}` : `SMTP test failed — ${r.error ?? "check settings"}`);
    } catch {
      onToast("⚠ Test failed — backend offline");
    } finally {
      setBusy(false);
    }
  };
```

- [ ] **Step 3: Render SMTP fields for the Email integration**

Replace the generic fields block:

```tsx
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">API endpoint</Label>
            <Input value={endpoint} onChange={e => setEndpoint(e.target.value)} className="h-9 font-mono tabular text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API key / Merchant ID</Label>
            <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="pk_live_…" className="h-9 font-mono tabular text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Secret / Webhook signing key</Label>
            <div className="relative">
              <Input type={showSecret ? "text" : "password"} value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••••••••••••" className="h-9 font-mono tabular text-xs pr-9" />
              <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sync frequency</Label>
            <Select value={syncFreq} onChange={e => setSyncFreq(e.target.value)} className="h-9">
              <option>Real-time (webhook)</option>
              <option>Every 5 minutes</option>
              <option>Every 15 minutes</option>
              <option>Hourly</option>
              <option>Daily</option>
            </Select>
          </div>
          <div className="rounded-md bg-info-soft/15 border border-info/20 p-2.5 text-[11px] inline-flex items-start gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
            <span>Credentials are stored encrypted at rest. Webhook signatures are verified before any payload is processed.</span>
          </div>
        </div>
```

with a branch on `isSmtp`:

```tsx
        <div className="px-5 py-4 space-y-3 overflow-y-auto">
          {isSmtp ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">SMTP host</Label>
                  <Input value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} placeholder="email-smtp.ap-south-1.amazonaws.com" className="h-9 font-mono tabular text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Port</Label>
                  <Input type="number" min={1} max={65535} value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: Number(e.target.value) || 0 }))} className="h-9 tabular" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Encryption</Label>
                  <Select value={smtp.encryption} onChange={e => setSmtp(s => ({ ...s, encryption: e.target.value }))} className="h-9">
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">From name</Label>
                  <Input value={smtp.fromName} onChange={e => setSmtp(s => ({ ...s, fromName: e.target.value }))} placeholder="The Pearl Marina" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">From email</Label>
                  <Input value={smtp.fromEmail} onChange={e => setSmtp(s => ({ ...s, fromEmail: e.target.value }))} placeholder="hello@thepearl.in" className="h-9 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Username</Label>
                <Input value={smtp.username} onChange={e => setSmtp(s => ({ ...s, username: e.target.value }))} placeholder="SMTP username / SES access key" className="h-9 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input type={showSmtpPw ? "text" : "password"} value={smtp.password} onChange={e => setSmtp(s => ({ ...s, password: e.target.value }))} placeholder={smtp.hasPassword ? "•••••••• (unchanged)" : "SMTP password / SES secret"} className="h-9 font-mono text-xs pr-9" />
                  <button type="button" onClick={() => setShowSmtpPw(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">Leave blank to keep the saved password.</p>
              </div>
              <div className="rounded-md bg-info-soft/15 border border-info/20 p-2.5 text-[11px] inline-flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                <span>Stored encrypted at rest. The app sends all outgoing email through this mailbox once saved.</span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">API endpoint</Label>
                <Input value={endpoint} onChange={e => setEndpoint(e.target.value)} className="h-9 font-mono tabular text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">API key / Merchant ID</Label>
                <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="pk_live_…" className="h-9 font-mono tabular text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secret / Webhook signing key</Label>
                <div className="relative">
                  <Input type={showSecret ? "text" : "password"} value={secret} onChange={e => setSecret(e.target.value)} placeholder="••••••••••••••••" className="h-9 font-mono tabular text-xs pr-9" />
                  <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sync frequency</Label>
                <Select value={syncFreq} onChange={e => setSyncFreq(e.target.value)} className="h-9">
                  <option>Real-time (webhook)</option>
                  <option>Every 5 minutes</option>
                  <option>Every 15 minutes</option>
                  <option>Hourly</option>
                  <option>Daily</option>
                </Select>
              </div>
              <div className="rounded-md bg-info-soft/15 border border-info/20 p-2.5 text-[11px] inline-flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                <span>Credentials are stored encrypted at rest. Webhook signatures are verified before any payload is processed.</span>
              </div>
            </>
          )}
        </div>
```

- [ ] **Step 4: Wire the footer buttons to the SMTP handlers**

Replace the footer:

```tsx
        <div className="flex justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="outline" onClick={onTest}><RefreshCw className="h-3.5 w-3.5" />Test connection</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave}><Save className="h-3.5 w-3.5" />Save</Button>
          </div>
        </div>
```

with:

```tsx
        <div className="flex justify-between gap-2 px-5 py-3 border-t border-border bg-surface-sunken/30">
          <Button variant="outline" disabled={busy} onClick={isSmtp ? testSmtp : onTest}><RefreshCw className="h-3.5 w-3.5" />Test connection</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={busy} onClick={isSmtp ? saveSmtp : onSave}><Save className="h-3.5 w-3.5" />Save</Button>
          </div>
        </div>
```

- [ ] **Step 5: Ensure `apiGet`/`apiPost` are imported**

Confirm the top of `setup-view.tsx` imports include `apiGet` and `apiPost` (the file already imports `apiPut`, `apiPost`, `apiGet`, `apiUpload`, `apiDownload`, `syncList` from `@/lib/api`). If `apiGet`/`apiPost` are missing from that import, add them. No change needed if already present.

- [ ] **Step 6: Typecheck + lint + build**

Run (from `luxe-pms/`): `npx tsc --noEmit` → exit 0.
Run: `npm run lint` → no new errors in `setup-view.tsx`.
Run: `npm run build` → succeeds.

- [ ] **Step 7: Commit**

```bash
git add "luxe-pms/src/app/(app)/setup/setup-view.tsx"
git commit -m "feat(setup): SMTP fields + test/save in the Email integration modal"
```

---

## Self-Review

**Spec coverage:**
- Encrypted storage, GET omits password, blank-on-save keeps existing → Task 1 (`SmtpSettingsController` + tests). ✓
- `GET/PUT /settings/smtp` registered before generic `/settings/{key}` → Task 1 Step 5. ✓
- `POST /settings/smtp/test` connection test → Task 1 (`test()`) + Task 2 (tests). ✓
- Runtime mailer override for all email send paths, fallback to `.env` → Task 3 (middleware + group). ✓
- Frontend SMTP fields (host/port/encryption/from/username/password show-hide), load/save/test, password "unchanged" when blank, other integrations unchanged → Task 4. ✓
- Validation (port range, encryption enum, email) → Task 1 `rules()`. ✓
- Out of scope items (other integrations' persistence, OAuth/DKIM, queues) → not implemented. ✓

**Placeholder scan:** No TBD/TODO/vague steps; every code step carries full code. ✓

**Type consistency:** `SmtpConfig::stored()/apply()/decrypt()` signatures used identically in the controller (Task 1) and middleware (Task 3). The settings JSON shape (`host, port, encryption, username, password, fromName, fromEmail, enabled`) is written by `update()` and read by `show()`, `stored()`, and the middleware test. Frontend `smtpBody()` keys match the controller `rules()` exactly (`host, port, encryption, username, password, fromName, fromEmail, enabled`, plus `to` only on test). `GET /settings/smtp` returns `hasPassword` consumed by the modal. ✓
