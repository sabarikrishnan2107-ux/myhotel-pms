<?php

namespace Tests\Unit;

use App\Support\Totp;
use PHPUnit\Framework\TestCase;

class TotpTest extends TestCase
{
    public function test_generate_secret_has_expected_length_and_base32_charset(): void
    {
        $secret = Totp::generateSecret(16);

        $this->assertSame(16, strlen($secret));
        $this->assertMatchesRegularExpression('/^[A-Z2-7]+$/', $secret);
    }

    public function test_generated_secrets_are_unique(): void
    {
        $this->assertNotSame(Totp::generateSecret(), Totp::generateSecret());
    }

    public function test_otpauth_uri_embeds_account_issuer_and_secret(): void
    {
        $uri = Totp::otpauthUri('JBSWY3DPEHPK3PXP', 'admin@hotel.com', 'MYHOTEL');

        $this->assertStringStartsWith('otpauth://totp/', $uri);
        $this->assertStringContainsString('secret=JBSWY3DPEHPK3PXP', $uri);
        $this->assertStringContainsString('issuer=MYHOTEL', $uri);
        $this->assertStringContainsString('admin%40hotel.com', $uri);
    }

    public function test_verify_rejects_malformed_codes(): void
    {
        $secret = Totp::generateSecret();

        $this->assertFalse(Totp::verify($secret, ''));
        $this->assertFalse(Totp::verify($secret, '123'));        // too short
        $this->assertFalse(Totp::verify($secret, 'abcdef'));     // non-numeric
        $this->assertFalse(Totp::verify($secret, '1234567'));    // too long
    }

    public function test_verify_accepts_the_current_code(): void
    {
        $secret = Totp::generateSecret();

        // Compute the real current code via the private generator for a deterministic round-trip.
        $at = new \ReflectionMethod(Totp::class, 'at');
        $at->setAccessible(true);
        $current = $at->invoke(null, $secret, time());

        $this->assertTrue(Totp::verify($secret, $current));
    }
}
