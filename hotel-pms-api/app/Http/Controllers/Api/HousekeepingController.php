<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FoundItem;
use App\Models\HousekeepingTask;
use App\Models\HousekeepingTaskPhoto;
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
 * Housekeeping mobile app — employee-facing task lifecycle.
 *
 * A housekeeper logs in on their phone, sees the rooms assigned to them, and
 * walks each task through a strict flow:
 *   assigned → acknowledged → before_photos → in_progress → after_photos → completed
 *
 * Every task endpoint verifies the task is assigned to the authenticated
 * employee (assignedToUserId). Company isolation is handled by the
 * BelongsToCompany global scope on the models.
 */
class HousekeepingController extends Controller
{
    /**
     * POST /api/housekeeping/login — authenticate a housekeeping employee and
     * return a mobile bearer token. Only users whose role or department is
     * housekeeping may log in (this app is for housekeeping staff only).
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'email'    => ['required', 'string'], // email OR employee code (e.g. "2001")
            'password' => ['required', 'string'],
        ]);

        // Accept either the email or the housekeeping employee code as the identifier.
        $identifier = trim($data['email']);
        $user = User::where('email', $identifier)
            ->orWhere('employee_code', $identifier)
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            AuditLog::record([
                'module' => 'Housekeeping', 'action' => 'Mobile login failed', 'entity' => $data['email'],
                'after' => 'Invalid credentials', 'severity' => 'warning',
                'ip' => $request->ip(), 'device' => $request->userAgent(),
                'company_id' => $user?->company_id,
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $isHousekeeping = stripos((string) $user->role, 'housekeep') !== false
            || stripos((string) $user->department, 'housekeep') !== false;
        if (! $isHousekeeping) {
            return response()->json([
                'message' => 'This app is for housekeeping staff only.',
                'reason'  => 'not_housekeeping',
            ], 403);
        }

        if (($user->company_id ?? null) === null) {
            return response()->json([
                'message' => 'No company assigned to this account.',
                'reason'  => 'no_company',
            ], 403);
        }

        // Respect the same licence-validity gate as the web login.
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
            'user' => $user->name, 'module' => 'Housekeeping', 'action' => 'Mobile login',
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
     * GET /api/housekeeping/tasks — active (not completed) tasks for the
     * authenticated employee, newest first.
     */
    public function tasks(Request $request)
    {
        $tasks = HousekeepingTask::where('assignedToUserId', $request->user()->id)
            ->where('status', '!=', 'completed')
            ->orderByDesc('id')
            ->get();

        return response()->json($tasks->map(fn ($t) => $this->shapeTask($t))->values());
    }

    /**
     * GET /api/housekeeping/history — completed tasks for the employee.
     */
    public function history(Request $request)
    {
        $tasks = HousekeepingTask::where('assignedToUserId', $request->user()->id)
            ->where('status', 'completed')
            ->orderByDesc('id')
            ->get();

        return response()->json($tasks->map(fn ($t) => $this->shapeTask($t))->values());
    }

    /**
     * GET /api/housekeeping/report — ALL housekeeping tasks for the company
     * (admin report) with before/after photos, voice, timeline + the employee
     * code. Newest first; the web report page does the date/status filtering.
     */
    public function report(Request $request)
    {
        $tasks = HousekeepingTask::orderByDesc('id')->get();
        $taskIds = $tasks->pluck('id')->all();
        $codes = User::whereIn('id', $tasks->pluck('assignedToUserId')->filter()->unique()->values()->all())
            ->pluck('employee_code', 'id');
        // Found items + maintenance tickets reported during each cleaning.
        $founds = FoundItem::whereIn('hkTaskId', $taskIds)->get()->groupBy('hkTaskId');
        $tickets = MaintenanceTicket::whereIn('hkTaskId', $taskIds)->get()->groupBy('hkTaskId');

        return response()->json($tasks->map(function ($t) use ($codes, $founds, $tickets) {
            $shaped = $this->shapeTask($t);
            $shaped['employeeCode'] = $codes[$t->assignedToUserId] ?? null;
            $shaped['foundItems'] = ($founds[$t->id] ?? collect())->map(fn ($f) => [
                'id' => $f->id, 'name' => $f->name, 'description' => $f->description,
                'photos' => $f->photos ?? [], 'voiceUrl' => $f->voiceUrl, 'status' => $f->status,
                'reportedAt' => $f->created_at ? $f->created_at->format('d M Y, h:i A')
                    : trim(((string) $f->foundDate) . ' ' . ((string) $f->foundTime)),
            ])->values();
            $shaped['maintenanceTickets'] = ($tickets[$t->id] ?? collect())->map(fn ($m) => [
                'id' => $m->id, 'title' => $m->title, 'description' => $m->description,
                'photos' => $m->photos ?? [], 'voiceUrl' => $m->voiceUrl, 'status' => $m->status,
                'reportedAt' => $m->created_at ? $m->created_at->format('d M Y, h:i A') : ((string) $m->reported),
            ])->values();
            return $shaped;
        })->values());
    }

    /**
     * POST /api/housekeeping/tasks/{id}/acknowledge
     */
    public function acknowledge(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);

        if ($task->status === 'assigned') {
            $task->acknowledgedAt = $this->stamp();
            $task->status = 'acknowledged';
            $task->save();
            $this->log($request, $task, 'Acknowledged');
        }

        return response()->json($this->shapeTask($task));
    }

    /**
     * POST /api/housekeeping/tasks/{id}/before-photos
     */
    public function beforePhotos(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);
        abort_if($task->status === 'completed', 422, 'This task is already completed.');

        $urls = $this->storePhotos($request, $task, 'before');
        abort_if(count($urls) === 0, 422, 'No photos were provided.');
        $this->log($request, $task, 'Before photos uploaded (' . count($urls) . ')');

        return response()->json($this->shapeTask($task));
    }

    /**
     * POST /api/housekeeping/tasks/{id}/start — begins the work timer.
     */
    public function start(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);
        // Start is the first action (no acknowledge step). Idempotent if re-tapped.
        abort_if($task->status === 'completed', 422, 'This task is already completed.');

        if (! $task->startedAt) {
            $task->startedAt = $this->stamp();
        }
        $task->status = 'in_progress';
        $task->save();

        $this->syncRoom($task, [
            'hkStatus'    => 'cleaning',
            'hkAssignee'  => $task->assignee,
            'hkStartedAt' => $task->startedAt,
        ]);
        $this->log($request, $task, 'Work started');

        return response()->json($this->shapeTask($task));
    }

    /**
     * POST /api/housekeeping/tasks/{id}/after-photos
     */
    public function afterPhotos(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);
        abort_if($task->status === 'completed', 422, 'This task is already completed.');

        $urls = $this->storePhotos($request, $task, 'after');
        abort_if(count($urls) === 0, 422, 'No photos were provided.');
        $this->log($request, $task, 'After photos uploaded (' . count($urls) . ')');

        return response()->json($this->shapeTask($task));
    }

    /**
     * POST /api/housekeeping/tasks/{id}/report-found — log a found item to Lost & Found.
     */
    public function reportFound(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);
        abort_if($task->status === 'completed', 422, 'This task is already completed.');

        $data = $request->validate([
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        $photos = $this->uploadFiles($request, 'photos');
        $voiceUrl = $this->uploadOne($request, 'voice');

        $item = FoundItem::create([
            'hkTaskId'      => $task->id,
            'name'          => $data['name'] ?: 'Found item',
            'description'   => $data['note'] ?? null,
            'category'      => 'Other',
            'foundLocation' => 'Room ' . $task->room,
            'foundAt'       => 'Room ' . $task->room,
            'foundDate'     => now()->toDateString(),
            'foundTime'     => now()->format('h:i A'),
            'foundBy'       => $request->user()->name,
            'department'    => 'Housekeeping',
            'status'        => 'stored',
            'photos'        => $photos,
            'voiceUrl'      => $voiceUrl,
        ]);
        $this->log($request, $task, 'Found item reported → Lost & Found');

        return response()->json(['ok' => true, 'foundItemId' => $item->id, 'photos' => $photos, 'voiceUrl' => $voiceUrl], 201);
    }

    /**
     * POST /api/housekeeping/tasks/{id}/report-damage — raise a maintenance ticket
     * with a photo, a typed note and a recorded voice message.
     */
    public function reportDamage(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);
        abort_if($task->status === 'completed', 422, 'This task is already completed.');

        $data = $request->validate([
            'note'  => ['sometimes', 'nullable', 'string', 'max:2000'],
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        $photos = $this->uploadFiles($request, 'photos');
        $voiceUrl = $this->uploadOne($request, 'voice');

        $ticket = MaintenanceTicket::create([
            'hkTaskId'    => $task->id,
            'code'        => 'MT-' . substr((string) time(), -6),
            'room'        => $task->room,
            'title'       => $data['title'] ?: ('Damage reported · Room ' . $task->room),
            'priority'    => 'high',
            'status'      => 'open',
            'reported'    => now()->toDateString(),
            'category'    => 'Housekeeping',
            'description' => $data['note'] ?? null,
            'photos'      => $photos,
            'voiceUrl'    => $voiceUrl,
        ]);
        $this->log($request, $task, 'Damage reported → Maintenance');

        return response()->json(['ok' => true, 'ticketId' => $ticket->id, 'photos' => $photos, 'voiceUrl' => $voiceUrl], 201);
    }

    /**
     * POST /api/housekeeping/tasks/{id}/complete — stops the timer, records the
     * total working time + notes, and marks the room clean.
     */
    public function complete(Request $request, $id)
    {
        $task = $this->ownedTask($request, $id);
        abort_if($task->status !== 'in_progress', 422, 'Start the task before finishing it.');

        $data = $request->validate([
            'notes'         => ['sometimes', 'nullable', 'string', 'max:2000'],
            'totalMinutes'  => ['sometimes', 'nullable', 'integer', 'min:0'],
            'total_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'outcome'       => ['sometimes', 'nullable', 'in:ready,maintenance'],
        ]);

        $minutes = $data['totalMinutes'] ?? $data['total_minutes'] ?? null;
        if ($minutes === null) {
            $minutes = 0;
            if ($task->startedAt) {
                try {
                    $minutes = (int) abs(Carbon::parse($task->startedAt)->diffInMinutes(now()));
                } catch (\Throwable $e) {
                    $minutes = 0;
                }
            }
        }

        $outcome = $data['outcome'] ?? 'ready';

        $task->completedAt = $this->stamp();
        $task->durationMin = (int) $minutes;
        if (array_key_exists('notes', $data)) {
            $task->notes = $data['notes'];
        }
        $task->outcome = $outcome;
        $voiceUrl = $this->uploadOne($request, 'voice');
        if ($voiceUrl) {
            $task->voiceUrl = $voiceUrl;
        }
        $task->status = 'completed';
        $task->save();

        if ($outcome === 'maintenance') {
            // 😠 Not OK → block the room (board shows "maintenance" for status
            // out-of-order, but only when hkStatus isn't dirty/cleaning) + ticket.
            $this->syncRoom($task, [
                'status'      => 'out-of-order',
                'hkStatus'    => 'clean',
                'hkAssignee'  => null,
                'hkStartedAt' => null,
            ]);
            MaintenanceTicket::create([
                'hkTaskId'    => $task->id,
                'code'        => 'MT-' . substr((string) time(), -6),
                'room'        => $task->room,
                'title'       => "Room {$task->room} flagged not-ready by housekeeping",
                'priority'    => 'high',
                'status'      => 'open',
                'reported'    => now()->toDateString(),
                'category'    => 'Housekeeping',
                'description' => $task->notes ?: 'Marked as not ready (needs maintenance) at cleaning completion.',
            ]);
        } else {
            // 😊 Ready → clear any block + mark clean → board shows "available".
            $this->syncRoom($task, [
                'status'      => 'active',
                'hkStatus'    => 'clean',
                'hkAssignee'  => null,
                'hkStartedAt' => null,
            ]);
        }
        $this->log($request, $task, "Completed ({$outcome}) in {$task->durationMin} min");

        return response()->json($this->shapeTask($task));
    }

    /**
     * GET /api/housekeeping/cleaned-today — rooms whose cleaning was completed
     * today (by anyone), so the team board can flag "done today".
     */
    public function cleanedToday(Request $request)
    {
        $today = now()->toDateString();
        $rows = HousekeepingTask::where('status', 'completed')
            ->get()
            ->filter(fn ($t) => $t->completedAt && str_starts_with((string) $t->completedAt, $today))
            ->map(fn ($t) => [
                'room'    => $t->room,
                'by'      => $t->assignee,
                'outcome' => $t->outcome,
                'at'      => $t->completedAt,
            ])
            ->values();

        return response()->json($rows);
    }

    /**
     * POST /api/housekeeping/self-assign — a housekeeper claims a room to clean.
     * Guards against two people cleaning the same room, and against re-cleaning a
     * room already done today (returns 409 with a reason so the app can suggest
     * another room).
     */
    public function selfAssign(Request $request)
    {
        $data = $request->validate([
            'room'      => ['required', 'string', 'max:50'],
            'roomId'    => ['sometimes', 'nullable', 'integer'],
            'floor'     => ['sometimes', 'nullable', 'integer'],
            'roomType'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'guestName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'roomState' => ['sometimes', 'nullable', 'string', 'max:50'],
            'type'      => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);
        $me = $request->user();

        // Already working this room myself → just return it (idempotent).
        $mine = HousekeepingTask::where('room', $data['room'])
            ->where('assignedToUserId', $me->id)
            ->where('status', '!=', 'completed')
            ->orderByDesc('id')->first();
        if ($mine) {
            return response()->json($this->shapeTask($mine), 200);
        }

        // Someone else is already cleaning it?
        $room = ! empty($data['roomId']) ? Room::find($data['roomId']) : Room::where('number', $data['room'])->first();
        if ($room && $room->hkStatus === 'cleaning' && $room->hkAssignee && strcasecmp($room->hkAssignee, (string) $me->name) !== 0) {
            return response()->json([
                'message' => "Room {$data['room']} is already being cleaned by {$room->hkAssignee}.",
                'reason'  => 'in_progress',
                'by'      => $room->hkAssignee,
            ], 409);
        }

        // Already cleaned today?
        $doneToday = HousekeepingTask::where('room', $data['room'])
            ->where('status', 'completed')->get()
            ->contains(fn ($t) => $t->completedAt && str_starts_with((string) $t->completedAt, now()->toDateString()));
        if ($doneToday) {
            return response()->json([
                'message' => "Room {$data['room']} is already cleaned today.",
                'reason'  => 'done_today',
            ], 409);
        }

        $task = HousekeepingTask::create([
            'room'             => $data['room'],
            'roomId'           => $data['roomId'] ?? ($room->id ?? null),
            'floor'            => $data['floor'] ?? ($room->floor ?? null),
            'roomType'         => $data['roomType'] ?? ($room->category ?? ''),
            'guestName'        => $data['guestName'] ?? null,
            'roomState'        => $data['roomState'] ?? null,
            'type'             => $data['type'] ?: 'Cleaning',
            'priority'         => 'normal',
            'status'           => 'assigned',
            'assignee'         => $me->name,
            'assignedToUserId' => $me->id,
            'assignedBy'       => 'Self',
            'assignedAt'       => now()->toDateTimeString(),
        ]);
        // Claim the room so other housekeepers see it's being handled.
        $this->syncRoom($task, [
            'hkStatus'    => 'cleaning',
            'hkAssignee'  => $me->name,
            'hkStartedAt' => now()->toDateTimeString(),
        ]);
        $this->log($request, $task, 'Self-assigned');

        return response()->json($this->shapeTask($task), 201);
    }

    // ---- helpers -----------------------------------------------------------

    /** Resolve a task and assert it belongs to the authenticated employee. */
    private function ownedTask(Request $request, $id): HousekeepingTask
    {
        $task = HousekeepingTask::find($id);
        abort_if(! $task, 404, 'Task not found.');
        abort_if((int) $task->assignedToUserId !== (int) $request->user()->id, 403, 'This task is not assigned to you.');

        return $task;
    }

    /** Guard the strict status flow. */
    private function ensureStatus(HousekeepingTask $task, array $allowed, string $message): void
    {
        abort_unless(in_array($task->status, $allowed, true), 422, $message);
    }

    /**
     * Store uploaded photo files (field `photos[]`) and/or pre-uploaded URLs
     * (field `photoUrls[]`) as task photo rows. Returns the stored URLs.
     */
    private function storePhotos(Request $request, HousekeepingTask $task, string $type): array
    {
        $request->validate([
            'photos'      => ['sometimes', 'array'],
            'photos.*'    => ['file', 'image', 'max:8192'], // ≤ 8 MB each
            'photoUrls'   => ['sometimes', 'array'],
            'photoUrls.*' => ['string'],
        ]);

        $stored = [];

        foreach ((array) $request->file('photos', []) as $file) {
            $name = uniqid('hk_', true) . '.' . strtolower($file->getClientOriginalExtension() ?: 'jpg');
            $file->move(public_path('uploads'), $name);
            $url = rtrim(request()->getSchemeAndHttpHost(), '/') . '/uploads/' . $name;
            HousekeepingTaskPhoto::create([
                'taskId' => $task->id, 'uploadedByUserId' => $request->user()->id,
                'photoType' => $type, 'photoUrl' => $url,
            ]);
            $stored[] = $url;
        }

        foreach ((array) $request->input('photoUrls', []) as $url) {
            if (is_string($url) && $url !== '') {
                HousekeepingTaskPhoto::create([
                    'taskId' => $task->id, 'uploadedByUserId' => $request->user()->id,
                    'photoType' => $type, 'photoUrl' => $url,
                ]);
                $stored[] = $url;
            }
        }

        return $stored;
    }

    /** Upload multiple image files ($field[]) → array of public URLs (+ accepts $fieldUrls[]). */
    private function uploadFiles(Request $request, string $field): array
    {
        $request->validate([$field => ['sometimes', 'array'], $field . '.*' => ['file', 'image', 'max:8192']]);
        $urls = [];
        foreach ((array) $request->file($field, []) as $file) {
            $name = uniqid('hk_', true) . '.' . strtolower($file->getClientOriginalExtension() ?: 'jpg');
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
            $name = uniqid('hk_', true) . '.' . strtolower($file->getClientOriginalExtension() ?: 'm4a');
            $file->move(public_path('uploads'), $name);
            return rtrim(request()->getSchemeAndHttpHost(), '/') . '/uploads/' . $name;
        }
        $alt = $request->input($field . 'Url');
        return is_string($alt) && $alt !== '' ? $alt : null;
    }

    /** Mirror the task state onto the room board (best-effort). */
    private function syncRoom(HousekeepingTask $task, array $attrs): void
    {
        $room = $task->roomId
            ? Room::find($task->roomId)
            : Room::where('number', $task->room)->first();
        if ($room) {
            $room->fill($attrs);
            $room->save();
        }
    }

    /** A full datetime string (columns are strings, not native dates). */
    private function stamp(): string
    {
        return now()->toDateTimeString();
    }

    private function log(Request $request, HousekeepingTask $task, string $after): void
    {
        AuditLog::record([
            'user' => $request->user()->name, 'module' => 'Housekeeping',
            'action' => 'Task update', 'entity' => "Room {$task->room}",
            'after' => $after, 'ip' => $request->ip(), 'device' => $request->userAgent(),
        ]);
    }

    /** Shape a task for the mobile app, with before/after photo URL arrays. */
    private function shapeTask(HousekeepingTask $t): array
    {
        $t->loadMissing('photos');
        $before = $t->photos->where('photoType', 'before')->pluck('photoUrl')->values()->all();
        $after  = $t->photos->where('photoType', 'after')->pluck('photoUrl')->values()->all();

        // Absolute epoch ms for the start (server stamp is a naive string). Lets
        // the app compute elapsed correctly even without a device-local origin.
        $startedAtMs = null;
        if ($t->startedAt) {
            try {
                $startedAtMs = (int) Carbon::parse($t->startedAt)->valueOf();
            } catch (\Throwable $e) {
                $startedAtMs = null;
            }
        }

        return [
            'id'             => $t->id,
            'roomId'         => $t->roomId,
            'room'           => $t->room,
            'roomNumber'     => $t->room,
            'floor'          => $t->floor,
            'assignedToUserId' => $t->assignedToUserId,
            'guestName'      => $t->guestName,
            'customerName'   => $t->guestName,
            'roomState'      => $t->roomState,
            'outcome'        => $t->outcome,
            'roomType'       => $t->roomType,
            'type'           => $t->type,
            'taskType'       => $t->type,
            'priority'       => $t->priority,
            'status'         => $t->status,
            'assignee'       => $t->assignee,
            'assignedBy'     => $t->assignedBy,
            'assignedAt'     => $t->assignedAt,
            'acknowledgedAt' => $t->acknowledgedAt,
            'startedAt'      => $t->startedAt,
            'startedAtMs'    => $startedAtMs,
            'completedAt'    => $t->completedAt,
            'durationMin'    => (int) $t->durationMin,
            'totalMinutes'   => (int) $t->durationMin,
            'notes'          => $t->notes,
            'voiceUrl'       => $t->voiceUrl,
            'photosBefore'   => $before,
            'photosAfter'    => $after,
        ];
    }
}
