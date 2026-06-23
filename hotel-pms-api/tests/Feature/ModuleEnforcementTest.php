<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ModuleEnforcementTest extends TestCase
{
    use RefreshDatabase;

    private function makeCompanyWithUser(array $modules, string $email): User
    {
        $cid = DB::table('master_companies')->insertGetId([
            'name'           => 'TestCo',
            'code'           => 'TC-' . uniqid(),
            'admin_email'    => $email,
            'admin_password' => 'x',
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2026-12-31',
            'plan'           => 'starter',
            'max_branches'   => 1,
            'max_rooms'      => 10,
            'max_employees'  => 10,
            'modules'        => json_encode($modules),
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return User::create([
            'name'       => 'Test User',
            'email'      => $email,
            'password'   => Hash::make('Secret@123'),
            'role'       => 'Admin',
            'company_id' => $cid,
        ]);
    }

    /**
     * Case A: company has ['front_office'] only (no 'accounts')
     * → GET /api/account-entries must return 403 with reason='module_not_licensed'
     */
    public function test_accounts_resource_blocked_when_module_not_licensed(): void
    {
        $user = $this->makeCompanyWithUser(['front_office'], 'blocked@hotel.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/account-entries')
            ->assertStatus(403)
            ->assertJsonPath('reason', 'module_not_licensed');
    }

    /**
     * Case B: company has ['front_office', 'accounts']
     * → GET /api/account-entries must return 200 (not 403)
     */
    public function test_accounts_resource_allowed_when_module_is_licensed(): void
    {
        $user = $this->makeCompanyWithUser(['front_office', 'accounts'], 'allowed@hotel.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/account-entries')
            ->assertStatus(200);
    }

    /**
     * Case C: core/front_office resource (bookings) is always allowed
     * even when modules = ['front_office'] only
     */
    public function test_core_resource_always_allowed_with_front_office_module(): void
    {
        $user = $this->makeCompanyWithUser(['front_office'], 'core@hotel.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/bookings')
            ->assertStatus(200);
    }

    /**
     * Extra: empty modules array = allow all (backward-compat)
     */
    public function test_empty_modules_allows_all_resources(): void
    {
        $user = $this->makeCompanyWithUser([], 'empty@hotel.com');

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/account-entries')
            ->assertStatus(200);
    }

    /**
     * Extra: user without company_id passes through (login gate handles it)
     */
    public function test_null_company_user_passes_through(): void
    {
        $user = User::factory()->create(); // no company_id

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/account-entries')
            ->assertStatus(200);
    }
}
