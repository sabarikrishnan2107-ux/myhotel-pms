<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Support\CompanyStatus;
use App\Support\Totp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/login — verify credentials, return a Sanctum bearer token.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
            'code'     => ['sometimes', 'nullable', 'string'],
        ]);

        // Enforce the configurable "lockout after N failed attempts" security setting.
        $security = AppSetting::where('key', 'security')->first()?->value ?? [];
        $maxAttempts = (int) ($security['lockoutAfter'] ?? 0);
        $throttleKey = 'login:' . strtolower($data['email']) . '|' . $request->ip();

        if ($maxAttempts > 0 && RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            AuditLog::record([
                'module' => 'Auth', 'action' => 'Login blocked', 'entity' => $data['email'],
                'after' => 'Account locked', 'severity' => 'critical',
                'ip' => $request->ip(), 'device' => $request->userAgent(),
            ]);
            throw ValidationException::withMessages([
                'email' => ["Too many failed attempts. Try again in {$seconds} second(s)."],
            ]);
        }

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            if ($maxAttempts > 0) {
                RateLimiter::hit($throttleKey, 900); // 15-minute lockout window
            }
            AuditLog::record([
                'module' => 'Auth', 'action' => 'Login failed', 'entity' => $data['email'],
                'after' => 'Invalid credentials', 'severity' => 'warning',
                'ip' => $request->ip(), 'device' => $request->userAgent(),
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Successful credentials — clear the failed-attempt counter.
        RateLimiter::clear($throttleKey);

        // If 2FA is on, require a valid authenticator code before issuing a token.
        if ($user->two_factor_enabled) {
            if (empty($data['code'])) {
                return response()->json(['two_factor_required' => true]);
            }
            if (! $user->two_factor_secret || ! Totp::verify($user->two_factor_secret, $data['code'])) {
                throw ValidationException::withMessages([
                    'code' => ['That code is invalid or expired.'],
                ]);
            }
        }

        // Block accounts with no company assigned (misconfigured users).
        if (($user->company_id ?? null) === null) {
            return response()->json([
                'message' => 'No company assigned to this account.',
                'reason'  => 'no_company',
            ], 403);
        }

        // Check company licence validity before issuing a token.
        $company = DB::table('master_companies')->where('id', $user->company_id)->first();
        if ($company) {
            $status = CompanyStatus::derive($company->status ?? 'active', $company->valid_from, $company->valid_to, now());
            if (in_array($status, ['suspended', 'expired', 'pending'], true)) {
                return response()->json([
                    'message' => 'Account access is blocked.',
                    'reason'  => $status === 'pending' ? 'before_valid_from' : $status,
                ], 403);
            }
        }

        // Apply the configurable session timeout as a per-token expiry.
        $sessionMin = (int) ($security['sessionMin'] ?? 0);
        $expiresAt = $sessionMin > 0 ? now()->addMinutes($sessionMin) : null;
        $token = $user->createToken('web', ['*'], $expiresAt)->plainTextToken;

        AuditLog::record([
            'user' => $user->name, 'module' => 'Auth', 'action' => 'Logged in',
            'entity' => $user->email, 'after' => 'Success',
            'ip' => $request->ip(), 'device' => $request->userAgent(),
        ]);

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user, $company),
        ]);
    }

    /**
     * Shape the authenticated user for the client, including their role and the
     * set of page keys that role may access (Admin / '*' = all pages).
     * Optionally accepts a pre-fetched $company object (from login flow) to avoid
     * a second DB query; if null the company is resolved from the user's company_id.
     */
    private function userPayload(User $user, ?object $company = null): array
    {
        $role = $user->role ?: 'Admin';
        $allowed = ['*'];
        if (strcasecmp($role, 'Admin') !== 0 && strcasecmp($role, 'Owner') !== 0) {
            $r = Role::where('company_id', $user->company_id)->whereRaw('LOWER(name) = ?', [mb_strtolower($role)])->first();
            $allowed = is_array($r?->permissions) ? array_values($r->permissions) : [];
        }

        // Resolve company if not pre-supplied (e.g. from /me refresh).
        if ($company === null && $user->company_id) {
            $company = DB::table('master_companies')->where('id', $user->company_id)->first();
        }

        $rawModules = ($company->modules ?? null) ?? null;
        $modules = is_string($rawModules) ? (json_decode($rawModules, true) ?: []) : (array) ($rawModules ?? []);

        return [
            'id'                 => $user->id,
            'name'               => $user->name,
            'email'              => $user->email,
            'role'               => $role,
            'department'         => $user->department,
            'pages'              => $allowed,
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'company'            => $company
                ? ['id' => $company->id, 'name' => $company->name, 'code' => $company->code]
                : null,
            'modules'            => $modules,
        ];
    }

    /**
     * GET /api/me — the authenticated user (company + modules included so page
     * refreshes keep module access without a separate round-trip).
     */
    public function me(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    /**
     * POST /api/change-password — verify current password, set a new one.
     */
    public function changePassword(Request $request)
    {
        // Derive the new-password rules from the configured Security "password policy".
        $policy = (string) (AppSetting::where('key', 'security')->first()?->value['policy'] ?? '');
        $min = 12;            // default preserves prior behaviour when unset
        $needSymbol = false;
        if (str_contains($policy, 'Standard')) {
            $min = 8;
        } elseif (str_contains($policy, 'Strong')) {
            $min = 12;
            $needSymbol = true;
        } elseif (str_contains($policy, 'Enterprise')) {
            $min = 16;
            $needSymbol = true;
        }

        $newRules = ['required', 'string', 'min:' . $min];
        if ($needSymbol) {
            $newRules[] = 'regex:/[^A-Za-z0-9]/';
        }

        $data = $request->validate(
            ['current_password' => ['required', 'string'], 'new_password' => $newRules],
            ['new_password.regex' => 'The new password must contain at least one symbol.'],
        );

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = Hash::make($data['new_password']);
        $user->save();

        return response()->json(['message' => 'Password updated']);
    }

    /**
     * POST /api/2fa/setup — generate a secret and return it + the otpauth URI
     * (for the QR code). Not enabled until a valid code is confirmed.
     */
    public function twoFactorSetup(Request $request)
    {
        $user = $request->user();
        $secret = Totp::generateSecret();
        $user->two_factor_secret = $secret;
        $user->two_factor_enabled = false;
        $user->save();

        return response()->json([
            'secret'  => $secret,
            'otpauth' => Totp::otpauthUri($secret, $user->email),
        ]);
    }

    /**
     * POST /api/2fa/enable — confirm a code against the secret and turn 2FA on.
     */
    public function twoFactorEnable(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        if (! $user->two_factor_secret || ! Totp::verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => ['That code is invalid or expired.']]);
        }

        $user->two_factor_enabled = true;
        $user->save();

        return response()->json(['message' => 'Two-factor authentication enabled', 'two_factor_enabled' => true]);
    }

    /**
     * POST /api/2fa/disable — turn 2FA off.
     */
    public function twoFactorDisable(Request $request)
    {
        $user = $request->user();
        $user->two_factor_enabled = false;
        $user->two_factor_secret = null;
        $user->save();

        return response()->json(['message' => 'Two-factor authentication disabled', 'two_factor_enabled' => false]);
    }

    /**
     * POST /api/logout — revoke the current token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
