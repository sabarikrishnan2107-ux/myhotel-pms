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

    // ---- Password policy enforcement ----

    private function actAsUserWithPolicy(string $policy): void
    {
        AppSetting::create(['key' => 'security', 'value' => ['policy' => $policy]]);
        $this->actingAs(User::factory()->create(['password' => Hash::make('currentpass1234')]), 'sanctum');
    }

    private function change(string $newPassword)
    {
        return $this->postJson('/api/change-password', [
            'current_password' => 'currentpass1234',
            'new_password'     => $newPassword,
        ]);
    }

    public function test_standard_policy_requires_eight_chars(): void
    {
        $this->actAsUserWithPolicy('Standard (min 8 chars)');

        $this->change('short7x')->assertStatus(422);   // 7 chars
        $this->change('eightchr')->assertOk();          // 8 chars, no symbol needed
    }

    public function test_strong_policy_requires_twelve_chars_and_a_symbol(): void
    {
        $this->actAsUserWithPolicy('Strong (12 + symbol)');

        $this->change('twelvecharsx')->assertStatus(422);   // 12 chars but no symbol
        $this->change('shorty1!')->assertStatus(422);        // has symbol but too short
        $this->change('twelvechars!1')->assertOk();          // 13 chars with symbol
    }

    public function test_enterprise_policy_requires_sixteen_chars_and_a_symbol(): void
    {
        $this->actAsUserWithPolicy('Enterprise (16 + symbol + rotated 90d)');

        $this->change('fourteenchars!')->assertStatus(422);       // 14 chars + symbol — too short
        $this->change('sixteencharswith!')->assertOk();           // 17 chars + symbol
    }
}
