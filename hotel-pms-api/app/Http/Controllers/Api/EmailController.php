<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\AppNotification;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Generic email sender. Every "email" action across the app (booking
 * confirmations, invoices, welcome notes, reminders, invites, …) posts here, so
 * all of them deliver through the single configured mail account (.env MAIL_*).
 * Content is structured (heading + rows + note) and rendered by the shared
 * branded template — no raw HTML is accepted.
 */
class EmailController extends Controller
{
    public function send(Request $request)
    {
        $data = $request->validate([
            'to'          => 'required|email',
            'subject'     => 'required|string|max:255',
            'heading'     => 'required|string|max:255',
            'greeting'    => 'nullable|string|max:255',
            'intro'       => 'nullable|string|max:2000',
            'rows'        => 'nullable|array|max:40',
            'rows.*.label' => 'required_with:rows|string|max:160',
            'rows.*.value' => 'nullable|string|max:1000',
            'note'        => 'nullable|string|max:2000',
            'context'     => 'nullable|string|max:160', // audit label, e.g. "Booking confirmation"
        ]);

        Mail::to($data['to'])->send(new AppNotification(
            subjectLine: $data['subject'],
            heading: $data['heading'],
            greeting: $data['greeting'] ?? null,
            intro: $data['intro'] ?? null,
            rows: $data['rows'] ?? [],
            note: $data['note'] ?? null,
        ));

        AuditLog::record([
            'module' => 'Notifications',
            'action' => 'Email sent',
            'entity' => ($data['context'] ?? 'Email') . ' → ' . $data['to'],
            'after'  => $data['subject'],
        ], $request);

        return response()->json(['sent' => true, 'to' => $data['to']]);
    }
}
