<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\FolioPayment;
use App\Models\Guest;
use App\Models\Room;

/**
 * Live dashboard KPIs aggregated from the real Postgres data
 * (rooms, bookings, guests, folio).
 */
class StatsController extends Controller
{
    public function index()
    {
        $today = date('Y-m-d');

        $totalRooms = max(1, Room::count());
        // In-house = explicitly checked-in, or (for un-actioned bookings) within their stay dates.
        $inHouse = Booking::where('status', 'checked-in')
            ->orWhere(fn ($q) => $q->whereIn('status', ['confirmed', ''])
                ->where('checkIn', '<=', $today)->where('checkOut', '>', $today))
            ->count();
        $occupied = min($inHouse, $totalRooms);

        $arrivals = Booking::where('checkIn', $today)->where('status', '!=', 'cancelled')->orderBy('roomNumber')->get();
        $departures = Booking::where('checkOut', $today)->where('status', '!=', 'cancelled')->orderBy('roomNumber')->get();

        $sourceMix = Booking::query()
            ->selectRaw('source, count(*) as bookings, coalesce(sum(total),0) as revenue')
            ->groupBy('source')
            ->orderByDesc('revenue')
            ->get();

        return response()->json([
            'today' => $today,
            'rooms' => [
                'total'        => $totalRooms,
                'occupied'     => $occupied,
                'available'    => max(0, $totalRooms - $occupied),
                'occupancyPct' => (int) round($occupied / $totalRooms * 100),
            ],
            'bookings' => [
                'total'            => Booking::count(),
                'inHouse'          => $inHouse,
                'arrivalsToday'    => $arrivals->count(),
                'departuresToday'  => $departures->count(),
            ],
            'guests' => [
                'total' => Guest::count(),
                'vip'   => Guest::where('vip', true)->count(),
            ],
            'revenue' => [
                'totalBooked'     => (int) Booking::sum('total'),
                'collected'       => (int) Booking::sum('advance'),
                'outstanding'     => (int) Booking::sum('balance'),
                'folioPayments'   => (int) FolioPayment::sum('amount'),
            ],
            'arrivals'   => $arrivals,
            'departures' => $departures,
            'sourceMix'  => $sourceMix,
        ]);
    }

    /**
     * GET /api/room-board — each configured room enriched with live occupancy
     * (from in-house bookings) and its housekeeping status.
     */
    public function roomBoard()
    {
        $today = date('Y-m-d');

        $inHouse = Booking::where('status', '!=', 'cancelled')
            ->where(fn ($q) => $q->where('status', 'checked-in')
                ->orWhere(fn ($q2) => $q2->where('checkIn', '<=', $today)->where('checkOut', '>', $today)))
            ->get()
            ->keyBy('roomNumber');

        $rooms = Room::orderBy('floor')->orderBy('number')->get()->map(function ($r) use ($inHouse) {
            $bk = $inHouse->get($r->number);
            $hk = $r->hkStatus ?: 'clean';
            $status = $bk
                ? 'occupied'
                : ($hk === 'dirty' ? 'dirty' : ($hk === 'cleaning' ? 'cleaning' : ($r->status === 'out-of-order' ? 'maintenance' : 'available')));

            return [
                'id'            => $r->id,
                'number'        => $r->number,
                'floor'         => (int) $r->floor,
                'type'          => $r->category,
                'status'        => $status,
                'hkStatus'      => $hk,
                'guestName'     => $bk->guestName ?? null,
                'source'        => $bk->source ?? null,
                'checkIn'       => $bk->checkIn ?? null,
                'checkOut'      => $bk->checkOut ?? null,
                'paymentStatus' => $bk->paymentStatus ?? null,
                'vip'           => (bool) ($bk->vip ?? false),
                'rate'          => (int) $r->baseTariff,
            ];
        });

        return response()->json($rooms);
    }
}
