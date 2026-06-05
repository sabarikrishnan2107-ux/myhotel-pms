<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLog extends Model
{
    protected $guarded = ['id'];

    /** Record one activity entry. Never throws — auditing must not break the action. */
    public static function record(array $data, ?Request $request = null): void
    {
        try {
            self::create(array_merge([
                'user'     => $request && $request->user() ? $request->user()->name : 'System',
                'ip'       => $request?->ip(),
                'device'   => $request?->userAgent(),
                'severity' => 'info',
            ], $data));
        } catch (\Throwable $e) {
            // swallow — a failed audit write must not abort the user's request
        }
    }
}
