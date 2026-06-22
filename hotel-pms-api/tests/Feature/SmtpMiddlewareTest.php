<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SmtpMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum');
    }

    private function enableSmtp(): void
    {
        AppSetting::create(['key' => 'smtp', 'value' => [
            'host' => 'smtp.hotel.test', 'port' => 587, 'encryption' => 'tls',
            'username' => 'apikey', 'password' => Crypt::encryptString('pw'),
            'fromName' => 'Pearl', 'fromEmail' => 'hello@pearl.test', 'enabled' => true,
        ]]);
    }

    private function emailPayload(): array
    {
        return ['to' => 'guest@example.com', 'subject' => 'Hi', 'heading' => 'Welcome'];
    }

    public function test_email_route_uses_hotel_smtp_when_enabled(): void
    {
        Mail::fake();
        $this->auth();
        $this->enableSmtp();

        $this->postJson('/api/email/send', $this->emailPayload())->assertOk();

        $this->assertEquals('smtp', config('mail.default'));
        $this->assertEquals('smtp.hotel.test', config('mail.mailers.smtp.host'));
        $this->assertEquals('hello@pearl.test', config('mail.from.address'));
    }

    public function test_email_route_untouched_when_smtp_disabled(): void
    {
        Mail::fake();
        $this->auth();
        // No smtp setting at all → middleware does nothing.
        $this->postJson('/api/email/send', $this->emailPayload())->assertOk();

        $this->assertNotEquals('smtp.hotel.test', config('mail.mailers.smtp.host'));
    }
}
