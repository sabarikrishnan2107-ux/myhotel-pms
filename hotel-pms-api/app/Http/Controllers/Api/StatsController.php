<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Booking;
use App\Models\CashierShift;
use App\Models\ComplianceLicense;
use App\Models\FbOrder;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\Guest;
use App\Models\HallBooking;
use App\Models\InventoryItem;
use App\Models\MaintenanceTicket;
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

        // Revenue split across departments (real folio + F&B + hall data).
        $roomRev = (int) Booking::sum('total');
        $fbRev   = (int) (FolioCharge::where('type', 'F&B')->sum('amount') + FbOrder::sum('total'));
        $hallRev = (int) HallBooking::sum('total');
        $advance = (int) (Booking::sum('advance') + FolioPayment::sum('amount'));
        $pending = (int) Booking::sum('balance');

        // Housekeeping dirty count from the live room board.
        $dirty = Room::whereIn('hkStatus', ['dirty', 'cleaning'])->count();

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
                'totalBooked'     => $roomRev,
                'collected'       => (int) Booking::sum('advance'),
                'outstanding'     => $pending,
                'folioPayments'   => (int) FolioPayment::sum('amount'),
                'room'            => $roomRev,
                'food'            => $fbRev,
                'hall'            => $hallRev,
                'advance'         => $advance,
                'pending'         => $pending,
                'total'           => $roomRev + $fbRev + $hallRev,
            ],
            'quickCounts' => [
                'checkin'      => $arrivals->count(),
                'checkout'     => $departures->count(),
                'housekeeping' => $dirty,
            ],
            'arrivals'   => $arrivals,
            'departures' => $departures,
            'sourceMix'  => $sourceMix,
        ]);
    }

    /** GET /api/dashboard/revenue-trend — last 6 calendar months of revenue by department. */
    public function revenueTrend()
    {
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $ts = strtotime("first day of -$i month");
            $months[date('Y-m', $ts)] = ['month' => date('M', $ts), 'room' => 0, 'food' => 0, 'hall' => 0];
        }

        foreach (Booking::selectRaw("substr(\"checkIn\",1,7) as ym, coalesce(sum(total),0) as v")->groupBy('ym')->get() as $r) {
            if (isset($months[$r->ym])) {
                $months[$r->ym]['room'] += (int) $r->v;
            }
        }
        foreach (FolioCharge::where('type', 'F&B')->selectRaw("substr(\"date\",1,7) as ym, coalesce(sum(amount),0) as v")->groupBy('ym')->get() as $r) {
            if (isset($months[$r->ym])) {
                $months[$r->ym]['food'] += (int) $r->v;
            }
        }
        foreach (HallBooking::selectRaw("substr(\"date\",1,7) as ym, coalesce(sum(total),0) as v")->groupBy('ym')->get() as $r) {
            if (isset($months[$r->ym])) {
                $months[$r->ym]['hall'] += (int) $r->v;
            }
        }

        return response()->json(array_values($months));
    }

    /** GET /api/dashboard/occupancy-forecast — next 30 days: real booked occupancy + a projected pickup. */
    public function occupancyForecast()
    {
        $totalRooms = max(1, Room::count());
        $out = [];
        for ($i = 0; $i < 30; $i++) {
            $day = date('Y-m-d', strtotime("+$i day"));
            $booked = Booking::where('status', '!=', 'cancelled')
                ->where('checkIn', '<=', $day)->where('checkOut', '>', $day)->count();
            $occ = (int) round(min($booked, $totalRooms) / $totalRooms * 100);
            // Projected pickup grows the further out the date is (more time to fill).
            $pickup = (int) round((100 - $occ) * (0.1 + 0.3 * ($i / 30)));
            $out[] = [
                'day'       => $i + 1,
                'occupancy' => $occ,
                'forecast'  => min(100, $occ + $pickup),
            ];
        }

        return response()->json($out);
    }

    /** GET /api/dashboard/alerts — operational alerts derived from real data. */
    public function alerts()
    {
        $alerts = [];

        foreach (CashierShift::whereNotNull('variance')->where('variance', '!=', 0)->get() as $s) {
            $alerts[] = ['id' => 'shift-'.$s->id, 'level' => 'warning',
                'text' => "Cash variance on Shift #{$s->number} — pending manager review", 'href' => '/cashier'];
        }
        foreach (InventoryItem::whereColumn('qty', '<', 'min')->get() as $it) {
            $alerts[] = ['id' => 'inv-'.$it->id, 'level' => 'danger',
                'text' => "Low stock: {$it->name} (".max(0, $it->min - $it->qty)." below minimum)", 'href' => '/inventory'];
        }
        foreach (ComplianceLicense::where('daysToExpiry', '<=', 30)->orderBy('daysToExpiry')->get() as $lic) {
            $d = (int) $lic->daysToExpiry;
            $when = $d < 0 ? 'expired '.abs($d).' days ago' : ($d === 0 ? 'expires today' : "expires in {$d} days");
            $alerts[] = ['id' => 'lic-'.$lic->id, 'level' => $d <= 7 ? 'danger' : 'warning',
                'text' => "{$lic->name} {$when}", 'href' => '/compliance'];
        }
        foreach (MaintenanceTicket::whereNotIn('status', ['completed', 'closed', 'resolved'])->get() as $m) {
            $alerts[] = ['id' => 'maint-'.$m->id, 'level' => $m->priority === 'high' ? 'danger' : 'warning',
                'text' => "{$m->title} — Room {$m->room} ({$m->status})", 'href' => '/maintenance'];
        }

        return response()->json(array_slice($alerts, 0, 8));
    }

    /** GET /api/dashboard/goals — month-to-date actuals vs configurable targets. */
    public function goals()
    {
        $monthPrefix = date('Y-m');
        $totalRooms = max(1, Room::count());

        $mtdBookings = Booking::where('checkIn', 'like', "$monthPrefix%")->where('status', '!=', 'cancelled');
        $revenue = (int) (clone $mtdBookings)->sum('total');
        $roomNights = (int) (clone $mtdBookings)->sum('nights');
        $adr = $roomNights > 0 ? (int) round($revenue / $roomNights) : 0;
        $direct = (clone $mtdBookings)->whereIn('source', ['Walk-in', 'Website', 'Direct', 'Direct / Website'])->count();
        $fb = (int) FolioCharge::where('type', 'F&B')->where('date', 'like', "$monthPrefix%")->sum('amount');
        $occupied = min(Booking::where('status', 'checked-in')->count(), $totalRooms);
        $occPct = (int) round($occupied / $totalRooms * 100);

        // Targets are configurable (Setup → AppSetting 'goals'); sensible defaults otherwise.
        $t = (array) (optional(AppSetting::where('key', 'goals')->first())->value ?? []);
        $target = fn (string $k, int $d) => (int) ($t[$k] ?? $d);

        $mk = fn (string $label, int $current, int $target, string $fmt) => [
            'label' => $label, 'current' => $current, 'target' => max(1, $target), 'format' => $fmt,
            'pace' => $current >= $target ? 'ahead' : ($current >= $target * 0.9 ? 'ontrack' : 'behind'),
        ];

        return response()->json([
            $mk('Total Revenue', $revenue, $target('revenue', 160000), 'money'),
            $mk('Occupancy', $occPct, $target('occupancy', 75), 'pct'),
            $mk('ADR', $adr, $target('adr', 720), 'money'),
            $mk('Direct Bookings', $direct, $target('direct', 60), 'number'),
            $mk('F&B Revenue', $fb, $target('fb', 24000), 'money'),
            $mk('Outstanding', (int) Booking::sum('balance'), $target('outstanding', 50000), 'money'),
        ]);
    }

    /**
     * GET /api/room-board — each configured room enriched with live occupancy
     * (from in-house bookings) and its housekeeping status.
     */
    public function roomBoard()
    {
        $today = date('Y-m-d');

        // A room is in-house if a booking is checked-in, or is within its stay dates
        // and not yet departed. Cancelled and checked-out bookings free the room.
        $inHouse = Booking::whereNotIn('status', ['cancelled', 'checked-out'])
            ->where(fn ($q) => $q->where('status', 'checked-in')
                ->orWhere(fn ($q2) => $q2->where('checkIn', '<=', $today)->where('checkOut', '>', $today)))
            ->get()
            ->keyBy('roomNumber');

        $rooms = Room::orderBy('floor')->orderBy('number')->get()->map(function ($r) use ($inHouse) {
            $bk = $inHouse->get($r->number);
            $hk = $r->hkStatus ?: 'clean';
            // Vacant rooms can be explicitly blocked or out-of-order; otherwise
            // housekeeping state decides whether they are sellable.
            $status = $bk
                ? 'occupied'
                : ($r->status === 'blocked' ? 'blocked'
                    : ($hk === 'dirty' ? 'dirty' : ($hk === 'cleaning' ? 'cleaning' : ($r->status === 'out-of-order' ? 'maintenance' : 'available'))));

            return [
                'id'            => $r->id,
                'number'        => $r->number,
                'floor'         => (int) $r->floor,
                'type'          => $r->category,
                'status'        => $status,
                'hkStatus'      => $hk,
                'hkAssignee'    => $r->hkAssignee ?? null,
                'hkStartedAt'   => $r->hkStartedAt ?? null,
                'guestName'     => $bk->guestName ?? null,
                'source'        => $bk->source ?? null,
                'checkIn'       => $bk->checkIn ?? null,
                'checkOut'      => $bk->checkOut ?? null,
                'paymentStatus' => $bk->paymentStatus ?? null,
                'vip'           => (bool) ($bk->vip ?? false),
                'rate'          => (int) $r->baseTariff,
                // Real booking identifiers so the Room Rack can act on the live
                // folio/booking (extend, reduce, change, payment, order).
                'bookingNo'     => $bk->bookingNo ?? null,
                'bookingId'     => $bk->id ?? null,
                'nights'        => $bk ? (int) $bk->nights : null,
                'total'         => $bk ? (int) $bk->total : null,
                'balance'       => $bk ? (int) $bk->balance : null,
            ];
        });

        return response()->json($rooms);
    }
}
