<?php

namespace App\Support;

/**
 * Minimal RFC-6238 TOTP (time-based one-time password) — compatible with
 * Google Authenticator, Authy, 1Password, etc.
 */
class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret(int $length = 16): string
    {
        $s = '';
        for ($i = 0; $i < $length; $i++) {
            $s .= self::ALPHABET[random_int(0, 31)];
        }

        return $s;
    }

    public static function otpauthUri(string $secret, string $account, string $issuer = 'MYHOTEL'): string
    {
        return sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            rawurlencode($issuer),
            rawurlencode($account),
            $secret,
            rawurlencode($issuer),
        );
    }

    /** Verify a 6-digit code, allowing ±1 time-step clock drift. */
    public static function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\D/', '', $code);
        if (strlen($code) !== 6) {
            return false;
        }
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals(self::at($secret, time() + ($i * 30)), $code)) {
                return true;
            }
        }

        return false;
    }

    private static function at(string $secret, int $time, int $period = 30, int $digits = 6): string
    {
        $counter = (int) floor($time / $period);
        $binCounter = pack('N', 0) . pack('N', $counter); // 8-byte big-endian
        $key = self::base32Decode($secret);
        $hash = hash_hmac('sha1', $binCounter, $key, true);
        $offset = ord($hash[19]) & 0xf;
        $value = ((ord($hash[$offset]) & 0x7f) << 24)
            | ((ord($hash[$offset + 1]) & 0xff) << 16)
            | ((ord($hash[$offset + 2]) & 0xff) << 8)
            | (ord($hash[$offset + 3]) & 0xff);

        return str_pad((string) ($value % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    private static function base32Decode(string $secret): string
    {
        $secret = strtoupper($secret);
        $bits = '';
        foreach (str_split($secret) as $char) {
            $pos = strpos(self::ALPHABET, $char);
            if ($pos === false) {
                continue;
            }
            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }
        $bytes = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $bytes .= chr(bindec($chunk));
            }
        }

        return $bytes;
    }
}
