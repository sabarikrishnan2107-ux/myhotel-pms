<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;

class AuditLogController extends Controller
{
    /** GET /api/audit-logs — most recent activity, newest first. */
    public function index()
    {
        return AuditLog::orderByDesc('id')->limit(300)->get()->map(fn (AuditLog $l) => [
            'id'       => (string) $l->id,
            'time'     => optional($l->created_at)->format('H:i') ?? '',
            'date'     => optional($l->created_at)->format('Y-m-d') ?? '',
            'user'     => $l->user,
            'module'   => $l->module,
            'action'   => $l->action,
            'entity'   => $l->entity ?: '—',
            'before'   => $l->before ?: '—',
            'after'    => $l->after ?: '—',
            'ip'       => $l->ip ?: 'internal',
            'device'   => $l->device ?: 'Server',
            'severity' => $l->severity,
        ]);
    }
}
