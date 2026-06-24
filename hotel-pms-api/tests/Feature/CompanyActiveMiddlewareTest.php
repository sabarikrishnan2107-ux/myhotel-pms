<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Tests for EnsureCompanyActive middleware (Fix 2) and
 * company-scoped security AppSetting login fix (Fix 1).
 */
class CompanyActiveMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    // ──────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────

    private function makeCompany(array $overrides = []): int
    {
        return DB::table('master_companies')->insertGetId(array_merge([
            'name'           => 'TestCo',
            'code'           => 'TC-' . uniqid(),
            'admin_email'    => 'admin@testco.com',
            'admin_password' => 'x',
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2026-12-31',
            'plan'           => 'starter',
            'max_branches'   => 1,
            'max_rooms'      => 10,
            'max_employees'  => 10,
            'modules'        => json_encode([]),
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ], $overrides));
    }

    private function makeUser(int $companyId, string $email = 'user@testco.com'): User
    {
        return User::create([
            'name'       => 'Test User',
            'email'      => $email,
            'password'   => Hash::make('Secret@123'),
            'role'       => 'Admin',
            'company_id' => $companyId,
        ]);
    }

    // ──────────────────────────────────────────────────────────────
    // Fix 2: Per-request company suspension/expiry gate (middleware)
    // ──────────────────────────────────────────────────────────────

    /** Test 1: Active company user can access /api/me (non-403). */
    public function test_active_company_user_can_reach_me_endpoint(): void
    {
        $cid  = $this->makeCompany(['status' => 'active']);
        $user = $this->makeUser($cid, 'active@testco.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/me')
            ->assertStatus(200);
    }

    /** Test 2: Suspended company blocks the SAME token on next request. */
    public function test_suspended_company_blocks_authenticated_request(): void
    {
        $cid  = $this->makeCompany(['status' => 'active']);
        $user = $this->makeUser($cid, 'suspend@testco.com');

        $this->actingAs($user, 'sanctum');

        // Before suspension: request succeeds.
        $this->getJson('/api/me')->assertStatus(200);

        // Suspend the company (same token — no re-login).
        DB::table('master_companies')->where('id', $cid)->update(['status' => 'suspended']);

        // Next request must be rejected.
        $this->getJson('/api/me')
            ->assertStatus(403)
            ->assertJsonPath('reason', 'suspended');
    }

    /** Expired company blocks requests after the valid_to date passes. */
    public function test_expired_company_blocks_authenticated_request(): void
    {
        $cid  = $this->makeCompany([
            'status'     => 'active',
            'valid_from' => '2025-01-01',
            'valid_to'   => '2026-05-31',   // already past (today is 2026-06-23)
        ]);
        $user = $this->makeUser($cid, 'expired@testco.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/me')
            ->assertStatus(403)
            ->assertJsonPath('reason', 'expired');
    }

    /** Pending (before valid_from) company blocks requests. */
    public function test_pending_company_blocks_authenticated_request(): void
    {
        $cid  = $this->makeCompany([
            'status'     => 'active',
            'valid_from' => '2030-01-01',
            'valid_to'   => '2030-12-31',
        ]);
        $user = $this->makeUser($cid, 'pending@testco.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/me')
            ->assertStatus(403)
            ->assertJsonPath('reason', 'before_valid_from');
    }

    /** Users with null company_id pass through (no gate applied). */
    public function test_null_company_user_passes_middleware(): void
    {
        $user = User::factory()->create(); // company_id = null

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/me')->assertStatus(200);
    }

    // ──────────────────────────────────────────────────────────────
    // Fix 1: Security AppSetting is scoped to the user's company
    // ──────────────────────────────────────────────────────────────

    /**
     * Company A has lockoutAfter=2; Company B has lockoutAfter=5.
     * Two wrong-password attempts for Company A's user should trigger lockout
     * (A's policy), but the same number of attempts for Company B's user should NOT
     * (B's policy allows 5).  This proves each company's own setting is used.
     */
    public function test_login_lockout_uses_each_companys_own_security_policy(): void
    {
        // Company A — strict: locks after 2 attempts
        $cidA  = $this->makeCompany(['code' => 'CMP-A-' . uniqid()]);
        $userA = $this->makeUser($cidA, 'usera@testco.com');
        AppSetting::create(['company_id' => $cidA, 'key' => 'security', 'value' => ['lockoutAfter' => 2]]);

        // Company B — lenient: locks after 5 attempts
        $cidB  = $this->makeCompany(['code' => 'CMP-B-' . uniqid()]);
        $userB = $this->makeUser($cidB, 'userb@testco.com');
        AppSetting::create(['company_id' => $cidB, 'key' => 'security', 'value' => ['lockoutAfter' => 5]]);

        // Two wrong-password attempts for Company A's user.
        $this->postJson('/api/login', ['email' => 'usera@testco.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'usera@testco.com', 'password' => 'wrong'])->assertStatus(422);

        // Third attempt for A must be blocked by lockout (A policy = 2).
        $this->postJson('/api/login', ['email' => 'usera@testco.com', 'password' => 'Secret@123'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', fn ($m) => str_contains($m, 'Too many failed attempts'));

        // Same two wrong-password attempts for Company B's user.
        $this->postJson('/api/login', ['email' => 'userb@testco.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'userb@testco.com', 'password' => 'wrong'])->assertStatus(422);

        // Third attempt for B should still succeed (B policy = 5, only 2 failures so far).
        $this->postJson('/api/login', ['email' => 'userb@testco.com', 'password' => 'Secret@123'])
            ->assertStatus(200)
            ->assertJsonStructure(['token']);
    }
}
