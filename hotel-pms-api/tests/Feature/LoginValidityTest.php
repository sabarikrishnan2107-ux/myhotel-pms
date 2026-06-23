<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginValidityTest extends TestCase
{
    use RefreshDatabase;

    private function makeCompany(array $o = []): int
    {
        return DB::table('master_companies')->insertGetId(array_merge([
            'name'           => 'C',
            'code'           => 'C-' . uniqid(),
            'admin_email'    => 'x@x.com',
            'admin_password' => 'x',
            'valid_from'     => '2026-01-01',
            'valid_to'       => '2026-12-31',
            'plan'           => 'starter',
            'max_branches'   => 1,
            'max_rooms'      => 10,
            'max_employees'  => 10,
            'modules'        => json_encode(['front_office', 'hrms']),
            'status'         => 'active',
            'created_at'     => now(),
            'updated_at'     => now(),
        ], $o));
    }

    public function test_active_company_user_can_login_and_gets_modules(): void
    {
        $cid = $this->makeCompany();

        User::create([
            'name'       => 'Test User',
            'email'      => 'active@hotel.com',
            'password'   => Hash::make('Secret@123'),
            'role'       => 'Admin',
            'company_id' => $cid,
        ]);

        $res = $this->postJson('/api/login', [
            'email'    => 'active@hotel.com',
            'password' => 'Secret@123',
        ]);

        $res->assertOk()
            ->assertJsonPath('user.modules', ['front_office', 'hrms']);
    }

    public function test_expired_company_blocks_login(): void
    {
        $cid = $this->makeCompany([
            'code'       => 'EXP-' . uniqid(),
            'valid_from' => '2025-01-01',
            'valid_to'   => '2026-05-31',
        ]);

        User::create([
            'name'       => 'Expired User',
            'email'      => 'expired@hotel.com',
            'password'   => Hash::make('Secret@123'),
            'role'       => 'Admin',
            'company_id' => $cid,
        ]);

        $res = $this->postJson('/api/login', [
            'email'    => 'expired@hotel.com',
            'password' => 'Secret@123',
        ]);

        $res->assertStatus(403)
            ->assertJsonPath('reason', 'expired');
    }

    public function test_suspended_company_blocks_login(): void
    {
        $cid = $this->makeCompany([
            'code'   => 'SUS-' . uniqid(),
            'status' => 'suspended',
        ]);

        User::create([
            'name'       => 'Suspended User',
            'email'      => 'suspended@hotel.com',
            'password'   => Hash::make('Secret@123'),
            'role'       => 'Admin',
            'company_id' => $cid,
        ]);

        $res = $this->postJson('/api/login', [
            'email'    => 'suspended@hotel.com',
            'password' => 'Secret@123',
        ]);

        $res->assertStatus(403)
            ->assertJsonPath('reason', 'suspended');
    }

    public function test_user_without_company_can_login(): void
    {
        User::factory()->create([
            'email'    => 'nocompany@hotel.com',
            'password' => Hash::make('Secret@123'),
        ]);

        $res = $this->postJson('/api/login', [
            'email'    => 'nocompany@hotel.com',
            'password' => 'Secret@123',
        ]);

        $res->assertOk()
            ->assertJsonPath('user.modules', []);
    }
}
