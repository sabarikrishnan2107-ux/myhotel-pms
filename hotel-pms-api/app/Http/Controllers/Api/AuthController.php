<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Totp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

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

        $token = $user->createToken('web')->plainTextToken;

        \App\Models\AuditLog::record([
            'user' => $user->name, 'module' => 'Auth', 'action' => 'Logged in',
            'entity' => $user->email, 'after' => 'Success',
            'ip' => $request->ip(), 'device' => $request->userAgent(),
        ]);

        return response()->json([
            'token' => $token,
            'user'  => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email],
        ]);
    }

    /**
     * GET /api/me — the authenticated user.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
        ]);
    }

    /**
     * POST /api/change-password — verify current password, set a new one.
     */
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:12'],
        ]);

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
