<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Staff accounts = real login users. Manages the auth `users` table with a
 * role + department; passwords are hashed and never returned.
 */
class StaffController extends Controller
{
    /** Public-safe projection of a user (no password / 2FA secret). */
    private function shape(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email,
            'role' => $u->role, 'department' => $u->department,
            'status' => $u->status, 'phone' => $u->phone,
            'twoFA' => (bool) $u->two_factor_enabled,
            'last' => optional($u->updated_at)->toDateTimeString(),
        ];
    }

    public function index()
    {
        return User::orderBy('id')->get()->map(fn ($u) => $this->shape($u))->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password'   => ['required', 'string', 'min:8'],
            'role'       => ['required', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
            'status'     => ['nullable', 'string', 'max:50'],
            'phone'      => ['nullable', 'string', 'max:50'],
        ]);

        $user = User::create([
            'name' => $data['name'], 'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'], 'department' => $data['department'] ?? null,
            'status' => $data['status'] ?? 'active', 'phone' => $data['phone'] ?? null,
        ]);

        AuditLog::record([
            'module' => 'Users', 'action' => 'Created', 'entity' => $user->email,
            'after' => "Staff account · {$user->role}",
        ], $request);

        return response()->json($this->shape($user), 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $data = $request->validate([
            'name'       => ['sometimes', 'string', 'max:255'],
            'email'      => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password'   => ['sometimes', 'nullable', 'string', 'min:8'],
            'role'       => ['sometimes', 'string', 'max:100'],
            'department' => ['sometimes', 'nullable', 'string', 'max:100'],
            'status'     => ['sometimes', 'string', 'max:50'],
            'phone'      => ['sometimes', 'nullable', 'string', 'max:50'],
            'twoFA'      => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'email', 'role', 'department', 'status', 'phone'] as $f) {
            if (array_key_exists($f, $data)) {
                $user->{$f} = $data[$f];
            }
        }
        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        if (array_key_exists('twoFA', $data)) {
            $user->two_factor_enabled = $data['twoFA'];
        }
        $user->save();

        AuditLog::record([
            'module' => 'Users', 'action' => 'Updated', 'entity' => $user->email, 'after' => 'Updated',
        ], $request);

        return response()->json($this->shape($user));
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);
        // Never let an admin delete their own currently-authenticated account.
        abort_if($request->user() && $request->user()->id === $user->id, 422, 'You cannot delete your own account.');
        $email = $user->email;
        $user->tokens()->delete();
        $user->delete();

        AuditLog::record([
            'module' => 'Users', 'action' => 'Deleted', 'entity' => $email, 'after' => 'Deleted', 'severity' => 'warning',
        ], $request);

        return response()->noContent();
    }
}
