<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecuritySettingsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): void
    {
        User::factory()->create(['email' => 'admin@hotel.com', 'password' => Hash::make('secret123')]);
    }

    private function setLockout(int $n): void
    {
        AppSetting::create(['key' => 'security', 'value' => ['lockoutAfter' => $n]]);
    }

    public function test_account_locks_out_after_configured_failed_attempts(): void
    {
        $this->makeUser();
        $this->setLockout(3);

        // Three wrong-password attempts are each rejected as bad credentials.
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'wrong'])
                ->assertStatus(422);
        }

        // The next attempt is blocked — even with the CORRECT password.
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123'])
            ->assertStatus(422)
            ->assertJsonPath('errors.email.0', fn ($m) => str_contains($m, 'Too many failed attempts'));

        $this->assertDatabaseHas('audit_logs', ['module' => 'Auth', 'action' => 'Login blocked']);
        $this->assertDatabaseHas('audit_logs', ['module' => 'Auth', 'action' => 'Login failed']);
    }

    public function test_successful_login_clears_the_failed_attempt_counter(): void
    {
        $this->makeUser();
        $this->setLockout(3);

        // Two failures, then a success — counter resets.
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123'])->assertOk();

        // Two more failures should not lock out (counter was cleared by the success).
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_no_lockout_when_setting_is_absent(): void
    {
        $this->makeUser();
        // No 'security' setting → lockout disabled → many failures never block.
        for ($i = 0; $i < 8; $i++) {
            $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'wrong'])->assertStatus(422);
        }
        $this->postJson('/api/login', ['email' => 'admin@hotel.com', 'password' => 'secret123'])->assertOk();
    }
}
