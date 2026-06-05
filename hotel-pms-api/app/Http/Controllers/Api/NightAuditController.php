<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FolioCharge;

/**
 * Night audit — the end-of-day close. Posts one night's room charge to every
 * in-house guest's folio and reports the business-date summary.
 */
class NightAuditController extends Controller
{
    public function run()
    {
        $today = date('Y-m-d');

        $inHouse = Booking::where('status', '!=', 'cancelled')
            ->where('status', '!=', 'checked-out')
            ->where(fn ($q) => $q->where('status', 'checked-in')
                ->orWhere(fn ($q2) => $q2->where('checkIn', '<=', $today)->where('checkOut', '>', $today)))
            ->get();

        $rooms = 0;
        $total = 0;
        $skipped = 0;

        foreach ($inHouse as $b) {
            // Idempotent: don't post a second night-audit room charge for the same day.
            $already = FolioCharge::where('bookingNo', $b->bookingNo)
                ->where('date', $today)
                ->where('description', 'like', '%night audit%')
                ->exists();
            if ($already) {
                $skipped++;
                continue;
            }

            $nightly = $b->nights > 0 ? (int) round($b->total / $b->nights) : (int) $b->total;

            FolioCharge::create([
                'bookingNo'   => $b->bookingNo,
                'date'        => $today,
                'description' => "Room — {$b->roomType} ({$b->roomNumber}) · night audit",
                'type'        => 'Room',
                'qty'         => 1,
                'rate'        => $nightly,
                'tax'         => 0,
                'amount'      => $nightly,
                'paidBy'      => 'Guest',
            ]);

            $rooms++;
            $total += $nightly;
        }

        \App\Models\AuditLog::record([
            'module' => 'Night Audit', 'action' => 'Audit completed',
            'entity' => "Business date {$today}",
            'after'  => "{$rooms} rooms posted · ₹{$total}",
        ]);

        return response()->json([
            'businessDate'   => $today,
            'roomsPosted'    => $rooms,
            'totalPosted'    => $total,
            'alreadyPosted'  => $skipped,
        ]);
    }
}
