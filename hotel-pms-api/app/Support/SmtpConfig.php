<?php

namespace App\Support;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;

/**
 * Loads the stored per-hotel SMTP settings and applies them to Laravel's
 * runtime mail config so outgoing email uses the hotel's own mailbox.
 */
class SmtpConfig
{
    /** Decrypted, usable config — or null when SMTP is disabled/incomplete. */
    public static function stored(): ?array
    {
        $v = AppSetting::where('key', 'smtp')->first()?->value ?? [];
        if (empty($v['enabled'])) {
            return null;
        }
        $password = self::decrypt($v['password'] ?? null);
        if (empty($v['host']) || empty($v['fromEmail']) || empty($password)) {
            return null;
        }

        return [
            'host'       => (string) $v['host'],
            'port'       => (int) ($v['port'] ?? 587),
            'username'   => (string) ($v['username'] ?? ''),
            'password'   => $password,
            'encryption' => (string) ($v['encryption'] ?? 'tls'),
            'fromName'   => (string) ($v['fromName'] ?? ''),
            'fromEmail'  => (string) $v['fromEmail'],
        ];
    }

    /** Apply a decrypted config array to the runtime mail config. */
    public static function apply(array $cfg): void
    {
        config([
            'mail.default'                 => 'smtp',
            'mail.mailers.smtp.transport'  => 'smtp',
            'mail.mailers.smtp.url'        => null,
            'mail.mailers.smtp.host'       => $cfg['host'],
            'mail.mailers.smtp.port'       => $cfg['port'],
            'mail.mailers.smtp.username'   => $cfg['username'] !== '' ? $cfg['username'] : null,
            'mail.mailers.smtp.password'   => $cfg['password'] !== '' ? $cfg['password'] : null,
            'mail.mailers.smtp.encryption' => $cfg['encryption'] === 'none' ? null : $cfg['encryption'],
            'mail.from.address'            => $cfg['fromEmail'],
            'mail.from.name'               => $cfg['fromName'] !== '' ? $cfg['fromName'] : $cfg['fromEmail'],
        ]);
        Mail::purge('smtp');
    }

    /** Decrypt a stored value: '' for empty input, null if it can't be decrypted. */
    public static function decrypt(?string $enc): ?string
    {
        if ($enc === null || $enc === '') {
            return '';
        }
        try {
            return Crypt::decryptString($enc);
        } catch (\Throwable) {
            return null;
        }
    }
}
