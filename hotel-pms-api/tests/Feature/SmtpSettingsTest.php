<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class SmtpSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function validPayload(array $over = []): array
    {
        return array_merge([
            'host' => 'smtp.example.com', 'port' => 587, 'encryption' => 'tls',
            'username' => 'apikey', 'password' => 'super-secret', 'fromName' => 'The Pearl',
            'fromEmail' => 'hello@thepearl.in', 'enabled' => true,
        ], $over);
    }

    public function test_put_encrypts_password_and_get_never_returns_it(): void
    {
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload())->assertOk();

        $stored = AppSetting::where('key', 'smtp')->first()->value;
        $this->assertNotEquals('super-secret', $stored['password']); // encrypted
        $this->assertEquals('super-secret', Crypt::decryptString($stored['password']));

        $this->getJson('/api/settings/smtp')
            ->assertOk()
            ->assertJsonMissingPath('password')
            ->assertJsonPath('hasPassword', true)
            ->assertJsonPath('host', 'smtp.example.com')
            ->assertJsonPath('enabled', true);
    }

    public function test_put_without_password_keeps_the_existing_one(): void
    {
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload())->assertOk();
        // Re-save with a blank password (e.g. user only changed the port).
        $this->putJson('/api/settings/smtp', $this->validPayload(['password' => '', 'port' => 465, 'encryption' => 'ssl']))->assertOk();

        $stored = AppSetting::where('key', 'smtp')->first()->value;
        $this->assertEquals('super-secret', Crypt::decryptString($stored['password']));
        $this->assertEquals(465, $stored['port']);
    }

    public function test_put_validates_input(): void
    {
        $this->auth();
        $this->putJson('/api/settings/smtp', $this->validPayload(['fromEmail' => 'not-an-email', 'encryption' => 'weird']))
            ->assertStatus(422);
    }
}
