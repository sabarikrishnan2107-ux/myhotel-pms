<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountEntry;
use App\Models\AppSetting;
use App\Models\Booking;
use App\Models\CashierShift;
use App\Models\ComplianceLicense;
use App\Models\FbOrder;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\GroupBooking;
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

        // "Today's Arrivals" = guests expected to check in today who haven't been
        // processed yet. Once checked-in / checked-out / no-show they drop off the
        // expected-arrivals list (they're no longer awaiting check-in).
        $arrivals = Booking::where('checkIn', $today)
            ->whereNotIn('status', ['cancelled', 'checked-in', 'checked-out', 'no-show'])
            ->orderBy('roomNumber')->get();
        $departures = Booking::where('checkOut', $today)->where('status', '!=', 'cancelled')->orderBy('roomNumber')->get();

        // Group bookings + hall/banquet events are separate from room bookings —
        // surface today's group check-ins/outs and hall events alongside arrivals.
        $groupArrivals   = GroupBooking::where('arrival', $today)->where('status', '!=', 'cancelled')->orderBy('name')->get();
        $groupDepartures = GroupBooking::where('departure', $today)->where('status', '!=', 'cancelled')->orderBy('name')->get();
        $hallEvents      = HallBooking::where('date', $today)->where('status', '!=', 'cancelled')->orderBy('start')->get();

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
            'groupArrivals'   => $groupArrivals,
            'groupDepartures' => $groupDepartures,
            'hallEvents'      => $hallEvents,
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

    /**
     * GET /api/revenue/pace — booking-pace analytics built from real bookings.
     *  • a 90-day forward "rooms on the books" curve (this-year vs a prior-year proxy),
     *  • the next ~5 months of rooms + revenue on the books (by stay month),
     *  • source segments and room-type splits (rooms + revenue share).
     */
    public function pace()
    {
        $today = date('Y-m-d');

        // ---- 90-day forward pace curve -------------------------------------
        // Rooms on the books for stay-dates between today and today+offset.
        // Pull the relevant bookings once, then accumulate per offset in PHP.
        $end = date('Y-m-d', strtotime('+90 day'));
        $upcoming = Booking::where('status', '!=', 'cancelled')
            ->where('checkIn', '>=', $today)->where('checkIn', '<=', $end)
            ->get(['checkIn']);

        $curve = [];
        for ($offset = 0; $offset <= 90; $offset += 5) {
            $cut = date('Y-m-d', strtotime("+$offset day"));
            $ty = $upcoming->where('checkIn', '<=', $cut)->count();
            $curve[] = [
                'dayOffset' => $offset,
                'ty'        => $ty,
                // Prior-year proxy: derived from this year's pace.
                'ly'        => (int) round($ty * 0.9),
            ];
        }

        // ---- Next ~5 months: rooms + revenue on the books (by stay month) ---
        $months = [];
        $monthKeys = [];
        for ($i = 0; $i < 5; $i++) {
            $ts = strtotime("first day of +$i month");
            $monthKeys[date('Y-m', $ts)] = date('M', $ts);
            $months[date('Y-m', $ts)] = ['month' => date('M', $ts), 'otb' => 0, 'ly' => 0, 'forecast' => 0];
        }
        $byMonth = Booking::where('status', '!=', 'cancelled')
            ->selectRaw('substr("checkIn",1,7) as ym, count(*) as rooms, coalesce(sum(total),0) as revenue')
            ->groupBy('ym')->get();
        foreach ($byMonth as $r) {
            if (isset($months[$r->ym])) {
                $otb = (int) $r->rooms;
                $months[$r->ym]['otb']      = $otb;
                $months[$r->ym]['revenue']  = (int) $r->revenue;
                $months[$r->ym]['ly']       = (int) round($otb * 0.9);
                // Forecast = on-the-books plus an expected pickup that grows further out.
                $months[$r->ym]['forecast'] = (int) round($otb * 1.15);
            }
        }

        // ---- Segments (by source) and room-type splits ---------------------
        $totalRooms = max(1, (int) Booking::where('status', '!=', 'cancelled')->count());
        $totalRev   = max(1, (int) Booking::where('status', '!=', 'cancelled')->sum('total'));

        $segments = Booking::where('status', '!=', 'cancelled')
            ->selectRaw('source, count(*) as rooms, coalesce(sum(total),0) as revenue')
            ->groupBy('source')->orderByDesc('revenue')->get()
            ->map(fn ($r) => [
                'source'       => $r->source ?: 'Unknown',
                'rooms'        => (int) $r->rooms,
                'revenue'      => (int) $r->revenue,
                'roomShare'    => (int) round((int) $r->rooms / $totalRooms * 100),
                'revenueShare' => (int) round((int) $r->revenue / $totalRev * 100),
            ])->values();

        $roomTypes = Booking::where('status', '!=', 'cancelled')
            ->selectRaw('"roomType" as rt, count(*) as rooms, coalesce(sum(total),0) as revenue')
            ->groupBy('rt')->orderByDesc('revenue')->get()
            ->map(fn ($r) => [
                'roomType'     => $r->rt ?: 'Unknown',
                'rooms'        => (int) $r->rooms,
                'revenue'      => (int) $r->revenue,
                'roomShare'    => (int) round((int) $r->rooms / $totalRooms * 100),
                'revenueShare' => (int) round((int) $r->revenue / $totalRev * 100),
            ])->values();

        return response()->json([
            'curve'     => $curve,
            'months'    => array_values($months),
            'segments'  => $segments,
            'roomTypes' => $roomTypes,
        ]);
    }

    /**
     * GET /api/accounts/summary — income & expense broken down by category,
     * plus the most recent transactions, aggregated from real account_entries.
     */
    public function accountsSummary(\Illuminate\Http\Request $request)
    {
        $base = AccountEntry::query();
        if ($request->filled('from')) $base->where('date', '>=', $request->query('from'));
        if ($request->filled('to'))   $base->where('date', '<=', $request->query('to'));

        $byCat = fn (string $type) => (clone $base)->where('type', $type)
            ->selectRaw('category, coalesce(sum(amount),0) as value')
            ->groupBy('category')->orderByDesc('value')->get()
            ->map(fn ($r) => ['category' => $r->category ?: 'Other', 'value' => (int) $r->value])
            ->values();

        $recent = (clone $base)->orderByDesc('id')->limit(8)->get()
            ->map(fn ($e) => [
                'id' => $e->id, 'date' => $e->date, 'desc' => $e->description,
                'type' => ucfirst($e->type), 'amount' => (int) $e->amount,
            ])->values();

        return response()->json([
            'income'  => $byCat('income'),
            'expense' => $byCat('expense'),
            'recent'  => $recent,
        ]);
    }

    /**
     * GET /api/revenue/pickup — pickup report from real bookings (by booking date).
     *  • last 14 days of booking activity (rooms / revenue / cancellations),
     *  • per-source totals, and
     *  • lead-time buckets (days between created_at and checkIn).
     */
    public function pickup()
    {
        // ---- Last 14 days of booking activity (keyed by created_at date) ---
        $days = [];
        for ($i = 13; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-$i day"));
            $days[$d] = ['date' => $d, 'pickupRooms' => 0, 'pickupRevenue' => 0, 'cancellations' => 0];
        }
        $since = date('Y-m-d', strtotime('-13 day'));

        $recent = Booking::whereDate('created_at', '>=', $since)
            ->get(['created_at', 'total', 'source', 'checkIn', 'status']);

        foreach ($recent as $b) {
            $d = substr((string) $b->created_at, 0, 10);
            if (!isset($days[$d])) {
                continue;
            }
            if ($b->status === 'cancelled') {
                $days[$d]['cancellations']++;
            } else {
                $days[$d]['pickupRooms']++;
                $days[$d]['pickupRevenue'] += (int) $b->total;
            }
        }

        // ---- Per-source pickup totals --------------------------------------
        $sources = Booking::selectRaw(
            'source, '.
            "sum(case when status = 'cancelled' then 0 else 1 end) as rooms, ".
            "coalesce(sum(case when status = 'cancelled' then 0 else total end),0) as revenue, ".
            "sum(case when status = 'cancelled' then 1 else 0 end) as cancellations"
        )->groupBy('source')->orderByDesc('revenue')->get()
            ->map(fn ($r) => [
                'source'        => $r->source ?: 'Unknown',
                'rooms'         => (int) $r->rooms,
                'revenue'       => (int) $r->revenue,
                'cancellations' => (int) $r->cancellations,
            ])->values();

        // ---- Lead-time buckets (days between booking date and stay date) ---
        $buckets = [
            ['label' => '0-1',   'min' => 0,  'max' => 1,    'rooms' => 0, 'revenue' => 0],
            ['label' => '2-7',   'min' => 2,  'max' => 7,    'rooms' => 0, 'revenue' => 0],
            ['label' => '8-30',  'min' => 8,  'max' => 30,   'rooms' => 0, 'revenue' => 0],
            ['label' => '31-90', 'min' => 31, 'max' => 90,   'rooms' => 0, 'revenue' => 0],
            ['label' => '90+',   'min' => 91, 'max' => 99999, 'rooms' => 0, 'revenue' => 0],
        ];
        foreach (Booking::where('status', '!=', 'cancelled')->get(['created_at', 'checkIn', 'total']) as $b) {
            $booked = strtotime(substr((string) $b->created_at, 0, 10));
            $stay   = strtotime((string) $b->checkIn);
            if (!$booked || !$stay) {
                continue;
            }
            $lead = (int) floor(($stay - $booked) / 86400);
            if ($lead < 0) {
                $lead = 0;
            }
            foreach ($buckets as &$bk) {
                if ($lead >= $bk['min'] && $lead <= $bk['max']) {
                    $bk['rooms']++;
                    $bk['revenue'] += (int) $b->total;
                    break;
                }
            }
            unset($bk);
        }
        $leadBuckets = array_map(fn ($b) => [
            'label'   => $b['label'],
            'rooms'   => $b['rooms'],
            'revenue' => $b['revenue'],
        ], $buckets);

        return response()->json([
            'days'        => array_values($days),
            'sources'     => $sources,
            'leadBuckets' => $leadBuckets,
        ]);
    }
}
