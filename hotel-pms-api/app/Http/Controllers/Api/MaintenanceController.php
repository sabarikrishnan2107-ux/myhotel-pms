<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\MaintenanceTicket;
use App\Models\Room;
use App\Models\User;
use App\Support\CompanyStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Maintenance technician mobile app — employee-facing ticket lifecycle. Mirrors
 * HousekeepingController. A technician logs in on their phone, sees the tickets
 * assigned to them (or claims one from the open queue), and walks each ticket
 * through a strict flow:
 *   open → assigned → in-progress → resolved   (escalate re-opens into the queue)
 *
 * Every ticket endpoint verifies the ticket is assigned to the authenticated
 * technician. Company isolation is handled by the BelongsToCompany global scope.
 */
class MaintenanceController extends Controller
{
    /**
     * POST /api/maintenance/login — authenticate a maintenance technician and
     * return a mobile bearer token. Only users whose role or department marks
     * them as maintenance/engineering may log in.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'        => ['sometimes', 'nullable', 'string'],
            'employeeCode' => ['sometimes', 'nullable', 'string'],
            'password'     => ['required', 'string'],
        ]);

        // Accept either the email or the maintenance employee code as identifier.
        $identifier = trim((string) ($data['employeeCode'] ?? $data['email'] ?? ''));
        if ($identifier === '') {
            throw ValidationException::withMessages([
                'email' => ['An email or employee code is required.'],
            ]);
        }

        $user = User::where('email', $identifier)
            ->orWhere('employee_code', $identifier)
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            AuditLog::record([
                'module' => 'Maintenance', 'action' => 'Mobile login failed', 'entity' => $identifier,
                'after' => 'Invalid credentials', 'severity' => 'warning',
                'ip' => $request->ip(), 'device' => $request->userAgent(),
                'company_id' => $user?->company_id,
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $isMaintenance = stripos((string) $user->role, 'maintenance') !== false
            || stripos((string) $user->role, 'engineer') !== false
            || stripos((string) $user->department, 'maintenance') !== false
            || stripos((string) $user->department, 'engineer') !== false;
        if (! $isMaintenance) {
            return response()->json([
                'message' => 'This app is for maintenance technicians only.',
                'reason'  => 'not_maintenance',
            ], 403);
        }

        if (($user->company_id ?? null) === null) {
            return response()->json([
                'message' => 'No company assigned to this account.',
                'reason'  => 'no_company',
            ], 403);
        }

        // Respect the same licence-validity gate as the web / housekeeping login.
        $company = DB::table('master_companies')->where('id', $user->company_id)->first();
        if ($company) {
            $status = CompanyStatus::derive($company->status ?? 'active', $company->valid_from, $company->valid_to, now());
            if (in_array($status, ['suspended', 'expired', 'pending'], true)) {
                return response()->json([
                    'message' => 'Account access is blocked.',
                    'reason'  => $status === 'pending' ? 'before_valid_from' : $status,
                ], 403);
            }
        }

        \App\Support\TenantProvisioner::ensure((int) $user->company_id);

        $token = $user->createToken('mobile', ['*'])->plainTextToken;

        AuditLog::record([
            'user' => $user->name, 'module' => 'Maintenance', 'action' => 'Mobile login',
            'entity' => $user->email, 'after' => 'Success',
            'ip' => $request->ip(), 'device' => $request->userAgent(),
        ]);

        return response()->json([
            'token'    => $token,
            'employee' => [
                'id'            => $user->id,
                'employeeCode'  => $user->employee_code,
                'employee_code' => $user->employee_code,
                'name'          => $user->name,
                'email'         => $user->email,
                'role'          => $user->role,
                'department'    => $user->department,
            ],
        ]);
    }

    /**
     * GET /api/maintenance/tickets — active tickets assigned to the technician.
     */
    public function tickets(Request $request)
    {
        $tickets = MaintenanceTicket::where('assigned_to_user_id', $request->user()->id)
            ->whereIn('status', ['assigned', 'in-progress'])
            ->orderByDesc('id')
            ->get();

        return response()->json($tickets->map(fn ($t) => $this->shapeTicket($t))->values());
    }

    /**
     * GET /api/maintenance/queue — the open, unassigned self-claim pool.
     */
    public function queue(Request $request)
    {
        $tickets = MaintenanceTicket::where('status', 'open')
            ->whereNull('assigned_to_user_id')
            ->orderByDesc('id')
            ->get();

        return response()->json($tickets->map(fn ($t) => $this->shapeTicket($t))->values());
    }

    /**
     * GET /api/maintenance/history — resolved tickets for the technician.
     */
    public function history(Request $request)
    {
        $tickets = MaintenanceTicket::where('assigned_to_user_id', $request->user()->id)
            ->where('status', 'resolved')
            ->orderByDesc('resolved_at')
            ->orderByDesc('id')
            ->get();

        return response()->json($tickets->map(fn ($t) => $this->shapeTicket($t))->values());
    }

    /**
     * POST /api/maintenance/tickets/{id}/claim — a technician self-assigns an
     * open ticket. Guards against two technicians grabbing the same ticket.
     */
    public function claim(Request $request, $id)
    {
        $ticket = MaintenanceTicket::find($id);
        abort_if(! $ticket, 404, 'Ticket not found.');
        $me = $request->user();

        // Already claimed by someone else → 409 (mirror housekeeping selfAssign).
        if ($ticket->assigned_to_user_id && (int) $ticket->assigned_to_user_id !== (int) $me->id) {
            return response()->json([
                'message' => "Ticket {$ticket->code} is already assigned to {$ticket->assignee}.",
                'reason'  => 'already_claimed',
                'by'      => $ticket->assignee,
            ], 409);
        }

        // Otherwise claim it (idempotent if already mine).
        $ticket->assigned_to_user_id = $me->id;
        $ticket->assignee = $me->name;
        if ($ticket->status === 'open') {
            $ticket->status = 'assigned';
        }
        $ticket->save();
        $this->log($request, $ticket, 'Claimed');

        return response()->json($this->shapeTicket($ticket));
    }

    /**
     * POST /api/maintenance/tickets/{id}/start — begins the work timer.
     */
    public function start(Request $request, $id)
    {
        $ticket = $this->ownedTicket($request, $id);

        if (! $ticket->started_at) {
            $ticket->started_at = now();
        }
        $ticket->status = 'in-progress';
        $ticket->save();
        $this->log($request, $ticket, 'Work started');

        return response()->json($this->shapeTicket($ticket));
    }

    /**
     * POST /api/maintenance/self-ticket — emergency: a technician raises a new
     * ticket for a room (from the All Rooms board) and it is assigned to them
     * immediately, ready to Accept & start. Company scope is automatic.
     */
    public function selfTicket(Request $request)
    {
        $data = $request->validate([
            'title'    => ['required', 'string', 'max:255'],
            'room'     => ['required', 'string', 'max:100'],
            'roomId'   => ['sometimes', 'nullable', 'integer'],
            'floor'    => ['sometimes', 'nullable', 'integer'],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'priority' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);
        $me = $request->user();

        $ticket = new MaintenanceTicket();
        $ticket->title    = $data['title'];
        $ticket->room     = $data['room'];
        $ticket->room_id  = $data['roomId'] ?? null;
        $ticket->floor    = $data['floor'] ?? null;
        $ticket->category = $data['category'] ?: 'General';
        $ticket->priority = $data['priority'] ?: 'high';
        $ticket->status   = 'assigned';
        $ticket->assigned_to_user_id = $me->id;
        $ticket->assignee = $me->name;
        $ticket->reported_by = $me->name;
        $ticket->reported = now()->toDateTimeString();
        $ticket->save(); // company_id set by BelongsToCompany
        $ticket->code = 'MT-' . (170000 + (int) $ticket->id);
        $ticket->save();

        $this->log($request, $ticket, "Emergency ticket raised for {$ticket->room}");

        return response()->json($this->shapeTicket($ticket), 201);
    }

    /**
     * POST /api/maintenance/tickets/{id}/before-photos — damage photos.
     */
    public function beforePhotos(Request $request, $id)
    {
        $ticket = $this->ownedTicket($request, $id);
        $urls = $this->uploadFiles($request, 'photos');
        abort_if(count($urls) === 0, 422, 'No photos were provided.');

        $ticket->photos_before = array_values(array_merge((array) ($ticket->photos_before ?? []), $urls));
        $ticket->save();
        $this->log($request, $ticket, 'Before photos uploaded (' . count($urls) . ')');

        return response()->json($this->shapeTicket($ticket));
    }

    /**
     * POST /api/maintenance/tickets/{id}/after-photos — repair photos.
     */
    public function afterPhotos(Request $request, $id)
    {
        $ticket = $this->ownedTicket($request, $id);
        $urls = $this->uploadFiles($request, 'photos');
        abort_if(count($urls) === 0, 422, 'No photos were provided.');

        $ticket->photos_after = array_values(array_merge((array) ($ticket->photos_after ?? []), $urls));
        $ticket->save();
        $this->log($request, $ticket, 'After photos uploaded (' . count($urls) . ')');

        return response()->json($this->shapeTicket($ticket));
    }

    /**
     * POST /api/maintenance/tickets/{id}/notes — work notes, parts used and an
     * optional voice memo.
     */
    public function notes(Request $request, $id)
    {
        $ticket = $this->ownedTicket($request, $id);

        $data = $request->validate([
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        if (array_key_exists('notes', $data)) {
            $ticket->work_notes = $data['notes'];
        }
        $ticket->parts = $this->parseParts($request);

        $voiceUrl = $this->uploadOne($request, 'voice');
        if ($voiceUrl) {
            $ticket->work_voice_url = $voiceUrl;
        }
        $ticket->save();
        $this->log($request, $ticket, 'Work notes saved');

        return response()->json($this->shapeTicket($ticket));
    }

    /**
     * POST /api/maintenance/tickets/{id}/resolve — close out the ticket.
     *   fixed    → resolved + put the room back in service.
     *   escalate → re-open into the queue (needs parts), room stays blocked.
     */
    public function resolve(Request $request, $id)
    {
        $ticket = $this->ownedTicket($request, $id);

        $data = $request->validate([
            'outcome'       => ['required', 'in:fixed,escalate'],
            'notes'         => ['sometimes', 'nullable', 'string', 'max:5000'],
            'totalMinutes'  => ['sometimes', 'nullable', 'integer', 'min:0'],
            'total_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ]);

        $outcome = $data['outcome'];
        $ticket->outcome = $outcome;

        $minutes = $data['totalMinutes'] ?? $data['total_minutes'] ?? null;
        if ($minutes !== null) {
            $ticket->total_minutes = (int) $minutes;
        }

        if (! empty($data['notes'])) {
            $ticket->work_notes = trim(($ticket->work_notes ? $ticket->work_notes . "\n" : '') . $data['notes']);
        }

        $voiceUrl = $this->uploadOne($request, 'voice');
        if ($voiceUrl) {
            $ticket->work_voice_url = $voiceUrl;
        }

        if ($outcome === 'fixed') {
            $ticket->status = 'resolved';
            $ticket->resolved_at = now();
            $ticket->save();
            $this->releaseRoom($ticket);
            $this->log($request, $ticket, 'Resolved (fixed)');
        } else {
            // Escalate → re-open into the queue for parts; leave the room blocked.
            $ticket->status = 'open';
            $ticket->assigned_to_user_id = null;
            $ticket->assignee = null;
            $ticket->save();
            $this->log($request, $ticket, 'Escalated — re-opened to queue');
        }

        return response()->json($this->shapeTicket($ticket));
    }

    // ---- helpers -----------------------------------------------------------

    /** Resolve a ticket and assert it belongs to the authenticated technician. */
    private function ownedTicket(Request $request, $id): MaintenanceTicket
    {
        $ticket = MaintenanceTicket::find($id);
        abort_if(! $ticket, 404, 'Ticket not found.');
        abort_if((int) $ticket->assigned_to_user_id !== (int) $request->user()->id, 403, 'This ticket is not assigned to you.');

        return $ticket;
    }

    /**
     * Put the room back in service after a fix — mirror how
     * HousekeepingController::complete flips the room to sellable + clean. The
     * room board derives "occupied" vs "available" from live bookings, so the
     * sellable room.status value is 'active'.
     */
    private function releaseRoom(MaintenanceTicket $ticket): void
    {
        $room = $ticket->room_id
            ? Room::find($ticket->room_id)
            : Room::where('number', $ticket->room)->first();
        if ($room && in_array((string) $room->status, ['blocked', 'out-of-order', 'maintenance'], true)) {
            $room->status = 'active';
            $room->hkStatus = 'clean';
            $room->save();
        }
    }

    /** Parse `parts` — a JSON-encoded array, a repeated parts[] field, or CSV. */
    private function parseParts(Request $request): array
    {
        if (! $request->has('parts')) {
            return [];
        }
        $raw = $request->input('parts');
        if (is_array($raw)) {
            return array_values(array_filter($raw, fn ($p) => is_string($p) && trim($p) !== ''));
        }
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_values(array_filter($decoded, fn ($p) => is_string($p) && trim($p) !== ''));
            }
            return array_values(array_filter(array_map('trim', explode(',', $raw)), fn ($p) => $p !== ''));
        }
        return [];
    }

    /** Upload multiple image files ($field[]) → array of public URLs (+ accepts $fieldUrls[]). */
    private function uploadFiles(Request $request, string $field): array
    {
        $request->validate([$field => ['sometimes', 'array'], $field . '.*' => ['file', 'image', 'max:8192']]);
        $urls = [];
        foreach ((array) $request->file($field, []) as $file) {
            // Write straight into public/uploads (served directly — no storage:link needed).
            $name = uniqid('mt_', true) . '.' . strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $file->move(public_path('uploads'), $name);
            $urls[] = rtrim(request()->getSchemeAndHttpHost(), '/') . '/uploads/' . $name;
        }
        foreach ((array) $request->input($field . 'Urls', []) as $u) {
            if (is_string($u) && $u !== '') {
                $urls[] = $u;
            }
        }
        return $urls;
    }

    /** Upload a single (audio) file → public URL, or null (also accepts {field}Url). */
    private function uploadOne(Request $request, string $field): ?string
    {
        if ($request->hasFile($field)) {
            $request->validate([$field => ['file', 'max:20480']]); // ≤ 20 MB
            $file = $request->file($field);
            $name = uniqid('mt_', true) . '.' . strtolower($file->getClientOriginalExtension() ?: 'm4a');
            $file->move(public_path('uploads'), $name);
            return rtrim(request()->getSchemeAndHttpHost(), '/') . '/uploads/' . $name;
        }
        $alt = $request->input($field . 'Url');
        return is_string($alt) && $alt !== '' ? $alt : null;
    }

    private function log(Request $request, MaintenanceTicket $ticket, string $after): void
    {
        AuditLog::record([
            'user' => $request->user()->name, 'module' => 'Maintenance',
            'action' => 'Ticket update', 'entity' => "Ticket {$ticket->code}",
            'after' => $after, 'ip' => $request->ip(), 'device' => $request->userAgent(),
        ]);
    }

    /** Absolutise a list of stored URLs (leaves already-absolute http(s) URLs). */
    private function absUrls($value): array
    {
        $base = rtrim(request()->getSchemeAndHttpHost(), '/');
        return collect((array) ($value ?? []))
            ->filter(fn ($u) => is_string($u) && $u !== '')
            ->map(fn ($u) => str_starts_with($u, 'http') ? $u : $base . '/' . ltrim($u, '/'))
            ->values()->all();
    }

    private function absUrl($value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }
        return str_starts_with($value, 'http') ? $value : rtrim(request()->getSchemeAndHttpHost(), '/') . '/' . ltrim($value, '/');
    }

    private function iso($value): ?string
    {
        if (! $value) {
            return null;
        }
        try {
            return Carbon::parse($value)->toIso8601String();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function epochMs($value): ?int
    {
        if (! $value) {
            return null;
        }
        try {
            return (int) Carbon::parse($value)->valueOf();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** Shape a ticket for the maintenance mobile app (exact JSON contract). */
    private function shapeTicket(MaintenanceTicket $t): array
    {
        $reportedAt = $t->created_at ?: ($t->reported ?? null);

        return [
            'id'               => (int) $t->id,
            'code'             => (string) $t->code,
            'title'            => (string) $t->title,
            'description'      => $t->description,
            'room'             => (string) $t->room,
            'roomId'           => $t->room_id !== null ? (int) $t->room_id : null,
            'floor'            => $t->floor !== null ? (int) $t->floor : null,
            'category'         => (string) $t->category,
            'priority'         => (string) $t->priority,
            'status'           => (string) $t->status,
            'assignee'         => $t->assignee,
            'assignedToUserId' => $t->assigned_to_user_id !== null ? (int) $t->assigned_to_user_id : null,
            'reportedAt'       => $this->iso($reportedAt),
            'reportedAtMs'     => $this->epochMs($reportedAt),
            'startedAtMs'      => $this->epochMs($t->started_at),
            'photos'           => $this->absUrls($t->photos),
            'voiceUrl'         => $this->absUrl($t->voiceUrl),
            'reportedBy'       => $t->reported_by,
            'photosBefore'     => $this->absUrls($t->photos_before),
            'photosAfter'      => $this->absUrls($t->photos_after),
            'parts'            => array_values((array) ($t->parts ?? [])),
            'notes'            => $t->work_notes,
            'workVoiceUrl'     => $this->absUrl($t->work_voice_url),
            'outcome'          => $t->outcome,
            'totalMinutes'     => $t->total_minutes !== null ? (int) $t->total_minutes : null,
            'resolvedAt'       => $this->iso($t->resolved_at),
        ];
    }
}
