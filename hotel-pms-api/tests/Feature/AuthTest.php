<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_valid_credentials_returns_a_token(): void
    {
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123')]);

        $res = $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123']);

        $res->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
    }

    public function test_login_with_wrong_password_fails(): void
    {
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123')]);

        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'nope'])
            ->assertStatus(422);
    }

    public function test_login_records_an_audit_entry(): void
    {
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123')]);

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
