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
            'employeeCode' => $u->employee_code,
            'status' => $u->status, 'phone' => $u->phone,
            'twoFA' => (bool) $u->two_factor_enabled,
            'last' => optional($u->updated_at)->toDateTimeString(),
        ];
    }

    /** True when this role/department is housekeeping. */
    private function isHousekeeping(?string $role, ?string $department): bool
    {
        return stripos((string) $role, 'housekeep') !== false
            || stripos((string) $department, 'housekeep') !== false;
    }

    /** True when this role/department is maintenance / engineering. */
    private function isMaintenance(?string $role, ?string $department): bool
    {
        $hay = strtolower((string) $role.' '.(string) $department);

        return str_contains($hay, 'maintenance') || str_contains($hay, 'engineer');
    }

    /**
     * The next employee code in a given 1000-block (e.g. 2000-series for
     * housekeeping, 3000-series for maintenance). Codes are global.
     */
    private function nextCodeInBlock(int $base): string
    {
        $max = User::whereNotNull('employee_code')
            ->pluck('employee_code')
            ->map(fn ($c) => (int) $c)
            ->filter(fn ($n) => $n >= $base && $n < $base + 1000)
            ->max();

        return (string) (($max ?: $base) + 1);
    }

    /** The 2000-series housekeeping code (2001, 2002, …). */
    private function nextHousekeepingCode(): string
    {
        return $this->nextCodeInBlock(2000);
    }

    /** The 3000-series maintenance code (3001, 3002, …). */
    private function nextMaintenanceCode(): string
    {
        return $this->nextCodeInBlock(3000);
    }

    /**
     * Auto employee code for an app-enabled department (housekeeping → 2000s,
     * maintenance/engineering → 3000s), or null for other staff.
     */
    private function autoCode(?string $role, ?string $department): ?string
    {
        if ($this->isHousekeeping($role, $department)) {
            return $this->nextHousekeepingCode();
        }
        if ($this->isMaintenance($role, $department)) {
            return $this->nextMaintenanceCode();
        }

        return null;
    }

    public function index()
    {
        return User::orderBy('id')->get()->map(fn ($u) => $this->shape($u))->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password'      => ['required', 'string', 'min:8'],
            'role'          => ['required', 'string', 'max:100'],
            'department'    => ['nullable', 'string', 'max:100'],
            'status'        => ['nullable', 'string', 'max:50'],
            'phone'         => ['nullable', 'string', 'max:50'],
            'employee_code' => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('users', 'employee_code')],
        ]);

        // Housekeeping (2000-series) and maintenance/engineering (3000-series)
        // staff get an auto-assigned employee code used to log into their
        // mobile app, unless one is supplied.
        $code = $data['employee_code'] ?? null;
        if (! $code) {
            $code = $this->autoCode($data['role'], $data['department'] ?? null);
        }

        $user = User::create([
            'name' => $data['name'], 'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'], 'department' => $data['department'] ?? null,
            'status' => $data['status'] ?? 'active', 'phone' => $data['phone'] ?? null,
            'employee_code' => $code,
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
            'name'          => ['sometimes', 'string', 'max:255'],
            'email'         => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password'      => ['sometimes', 'nullable', 'string', 'min:8'],
            'role'          => ['sometimes', 'string', 'max:100'],
            'department'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'status'        => ['sometimes', 'string', 'max:50'],
            'phone'         => ['sometimes', 'nullable', 'string', 'max:50'],
            'employee_code' => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('users', 'employee_code')->ignore($user->id)],
            'twoFA'         => ['sometimes', 'boolean'],
        ]);

        foreach (['name', 'email', 'role', 'department', 'status', 'phone', 'employee_code'] as $f) {
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
        // If this account is (now) an app-enabled dept and still has no code, assign one.
        if (! $user->employee_code) {
            $user->employee_code = $this->autoCode($user->role, $user->department);
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
