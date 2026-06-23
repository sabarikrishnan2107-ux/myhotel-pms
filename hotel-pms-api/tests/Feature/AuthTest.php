<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** Insert a minimal active company row and return its id. */
    private function makeCompany(): int
    {
        return DB::table('master_companies')->insertGetId([
            'name'           => 'Test Hotel',
            'code'           => 'TST-' . uniqid(),
            'admin_email'    => 'admin@hotel.com',
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
        ]);
    }

    public function test_login_with_valid_credentials_returns_a_token(): void
    {
        $cid = $this->makeCompany();
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123'), 'company_id' => $cid]);

        $res = $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123']);

        $res->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_login_with_wrong_password_fails(): void
    {
        $cid = $this->makeCompany();
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123'), 'company_id' => $cid]);

        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'nope'])
            ->assertStatus(422);
    }

    public function test_login_records_an_audit_entry(): void
    {
        $cid = $this->makeCompany();
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123'), 'company_id' => $cid]);

        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123'])->assertOk();

        $this->assertDatabaseHas('audit_logs', ['module' => 'Auth', 'action' => 'Logged in']);
    }

    public function test_protected_route_requires_authentication(): void
    {
        $this->getJson('/api/guests')->assertStatus(401);
    }

    public function test_authenticated_user_can_reach_protected_routes(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->getJson('/api/guests')->assertOk();
    }
}
