<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

/**
 * Endpoints for the Hotel Client check-in app.
 *
 *   GET  /api/bookings/mobile                     bookings to verify (tenant-scoped)
 *   GET  /api/bookings/{id}                        a single booking (mobile shape)
 *   POST /api/bookings/{id}/verification           upload guest photo / ID / signature
 *
 * All queries go through the Booking model's BelongsToCompany global scope,
 * so a token only ever sees and mutates its own company's bookings.
 */
class VerificationController extends Controller
{
    /** GET /api/bookings/mobile */
    public function mobile()
    {
        $bookings = Booking::query()
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->map(fn (Booking $b) => $this->mapBooking($b));

        return response()->json($bookings);
    }

    /** GET /api/bookings/{id} */
    public function show(string $id)
    {
        $booking = Booking::findOrFail($id);

        return response()->json($this->mapBooking($booking));
    }

    /** POST /api/bookings/{id}/verification */
    public function store(Request $request, string $id)
    {
        // Each document may arrive as a multipart file (mobile app), a base64
        // data URI (web form captures), raw SVG markup (signature), or an
        // already-stored https URL (left untouched). So no file/image rules.
        $data = $request->validate([
            'guest_photo'         => ['nullable'],
            'id_front'            => ['nullable'],
            'id_back'             => ['nullable'],
            'signature'           => ['nullable'],
            'verification_status' => ['nullable', 'string'],
            'uploaded_by'         => ['nullable', 'string'],
            'uploaded_at'         => ['nullable', 'string'],
        ]);

        $booking = Booking::findOrFail($id);
        $this->ensureUploadsDir();

        foreach (['guest_photo', 'id_front', 'id_back', 'signature'] as $field) {
            $stored = $this->ingest($request, $field, $booking->id);
            if ($stored !== null) {
                $booking->{$field} = $stored;
            }
        }

        // Completeness drives the status so a partial push (e.g. ID uploaded in
        // the web form) shows as in-progress until the rest is captured.
        $present = 0;
        foreach (['guest_photo', 'id_front', 'id_back', 'signature'] as $field) {
            if (!empty($booking->{$field})) {
                $present++;
            }
        }
        $booking->verification_status = $present >= 4 ? 'synced' : ($present > 0 ? 'in_progress' : 'not_started');
        $booking->uploaded_by = $data['uploaded_by']
            ?? optional($request->user())->name
            ?? 'Front Desk';
        $booking->uploaded_at = now();
        $booking->save();

        AuditLog::record([
            'user'   => $booking->uploaded_by,
            'module' => 'Front Desk',
            'action' => 'Guest verification captured',
            'entity' => $booking->bookingNo ?: ('Booking #' . $booking->id),
            'after'  => $booking->verification_status === 'synced' ? 'Documents complete' : 'Documents updated',
            'ip'     => $request->ip(),
            'device' => $request->userAgent(),
        ]);

        return response()->json([
            'ok'                  => true,
            'booking_id'          => (string) $booking->id,
            'verification_status' => $booking->verification_status,
            'uploaded_at'         => optional($booking->uploaded_at)->toIso8601String(),
            'booking'             => $this->mapBooking($booking->fresh()),
        ]);
    }

    // ---- helpers -----------------------------------------------------------

    private function mapBooking(Booking $b): array
    {
        return [
            'booking_id'          => (string) $b->id,
            'reference'           => $b->bookingNo ?: ('BK-' . $b->id),
            'guest_name'          => $b->guestName ?: 'Guest',
            'room_number'         => $b->roomNumber ?: null,
            'room_type'           => $b->roomType ?: null,
            'check_in'            => $b->checkIn ?: null,
            'check_out'           => $b->checkOut ?: null,
            'nights'              => (int) $b->nights,
            'adults'              => (int) $b->adults,
            'children'            => (int) $b->children,
            'notes'               => $b->source ? ('Source: ' . $b->source) : null,
            'status'              => $this->mapStatus($b->status ?? null),
            'verification_status' => $b->verification_status ?: 'not_started',
            'documents'           => [
                'guest_photo' => $b->guest_photo,
                'id_front'    => $b->id_front,
                'id_back'     => $b->id_back,
                'signature'   => $b->signature,
            ],
        ];
    }

    /** Map the PMS booking status to the app's BookingStatus enum. */
    private function mapStatus(?string $raw): string
    {
        $s = strtolower((string) $raw);
        if (str_contains($s, 'depart') || str_contains($s, 'checked-out') || str_contains($s, 'checkout')) {
            return 'departed';
        }
        if (str_contains($s, 'in-house') || str_contains($s, 'inhouse') || str_contains($s, 'checked-in') || str_contains($s, 'checkin')) {
            return 'checked_in';
        }
        return 'confirmed';
    }

    private function storeImage(UploadedFile $file, int $bookingId, string $field): string
    {
        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = "verif_{$bookingId}_{$field}_" . uniqid('', true) . ".{$ext}";
        $file->move(public_path('uploads'), $name);

        return $this->publicUrl($name);
    }

    /**
     * Resolve one document field to a stored URL, accepting any of:
     * multipart file, base64 data URI, raw SVG markup, or an existing URL.
     * Returns null when the field is absent (so the existing value is kept).
     */
    private function ingest(Request $request, string $field, int $bookingId): ?string
    {
        if ($request->hasFile($field)) {
            return $this->storeImage($request->file($field), $bookingId, $field);
        }

        $val = $request->input($field);
        if (!is_string($val) || $val === '') {
            return null;
        }

        // base64 data URI (e.g. data:image/jpeg;base64,....) from the web form
        if (preg_match('#^data:([\w/+.\-]+);base64,(.*)$#s', $val, $m)) {
            if (strlen($m[2]) > 15_000_000) { // ~11 MB binary guard
                return null;
            }
            $bin = base64_decode($m[2], true);
            if ($bin === false) {
                return null;
            }
            return $this->storeRaw($bin, $bookingId, $field, $this->extFromMime($m[1]));
        }

        // raw SVG markup (mobile signature pad)
        if (str_contains($val, '<svg')) {
            return $this->storeRaw($val, $bookingId, $field, 'svg');
        }

        // already a stored URL — keep as-is
        if (preg_match('#^https?://#i', $val)) {
            return $val;
        }

        return null;
    }

    private function storeRaw(string $contents, int $bookingId, string $field, string $ext): string
    {
        $name = "verif_{$bookingId}_{$field}_" . uniqid('', true) . ".{$ext}";
        file_put_contents(public_path('uploads/' . $name), $contents);

        return $this->publicUrl($name);
    }

    private function extFromMime(string $mime): string
    {
        return match (strtolower($mime)) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png'               => 'png',
            'image/webp'              => 'webp',
            'image/svg+xml'           => 'svg',
            'application/pdf'         => 'pdf',
            default                   => 'bin',
        };
    }

    private function ensureUploadsDir(): void
    {
        $dir = public_path('uploads');
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
    }

    private function publicUrl(string $name): string
    {
        return rtrim(config('app.url'), '/') . '/uploads/' . $name;
    }
}
