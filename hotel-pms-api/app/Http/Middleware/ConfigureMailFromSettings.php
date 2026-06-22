<?php

namespace App\Http\Middleware;

use App\Support\SmtpConfig;
use Closure;
use Illuminate\Http\Request;

/**
 * Applies the hotel's stored SMTP settings to the runtime mail config so the
 * request's outgoing email uses their own mailbox. No-op (falls back to .env)
 * when SMTP is not configured/enabled.
 */
class ConfigureMailFromSettings
{
    public function handle(Request $request, Closure $next)
    {
        $cfg = SmtpConfig::stored();
        if ($cfg !== null) {
            SmtpConfig::apply($cfg);
        }

        return $next($request);
    }
}
