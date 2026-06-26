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
        $data = $request->validate([
            'guest_photo'         => ['nullable', 'file', 'image', 'max:8192'],
            'id_front'            => ['nullable', 'file', 'image', 'max:8192'],
            'id_back'             => ['nullable', 'file', 'image', 'max:8192'],
            // Signature arrives as raw SVG markup (string) or, optionally, an image file.
            'signature'           => ['nullable'],
            'verification_status' => ['nullable', 'string'],
            'uploaded_by'         => ['nullable', 'string'],
            'uploaded_at'         => ['nullable', 'string'],
        ]);

        $booking = Booking::findOrFail($id);
        $this->ensureUploadsDir();

        foreach (['guest_photo', 'id_front', 'id_back'] as $field) {
            if ($request->hasFile($field)) {
                $booking->{$field} = $this->storeImage($request->file($field), $booking->id, $field);
            }
        }

        if ($request->hasFile('signature')) {
            $booking->signature = $this->storeImage($request->file('signature'), $booking->id, 'signature');
        } elseif (!empty($data['signature'])) {
            $booking->signature = $this->storeSignatureSvg((string) $data['signature'], $booking->id);
        }

        $booking->verification_status = 'synced';
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
            'after'  => 'Documents uploaded',
            'ip'     => $request->ip(),
            'device' => $request->userAgent(),
        ]);

        return response()->json([
            'ok'                  => true,
            'booking_id'          => (string) $booking->id,
            'verification_status' => 'synced',
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

    private function storeSignatureSvg(string $svg, int $bookingId): string
    {
        $name = "verif_{$bookingId}_signature_" . uniqid('', true) . '.svg';
        file_put_contents(public_path('uploads/' . $name), $svg);

        return $this->publicUrl($name);
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
