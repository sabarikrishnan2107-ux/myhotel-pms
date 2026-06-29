<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountEntry;
use App\Models\AppSetting;
use App\Models\BanquetOrder;
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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $from = $request->query('from');
        $to   = $request->query('to');

        $base = AccountEntry::query();
        if ($from) $base->where('date', '>=', $from);
        if ($to)   $base->where('date', '<=', $to);

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

        // ---- Live cash received from bookings (authoritative income categories) ----
        // Each source is filtered on its own date column when a range is supplied;
        // with no range, all rows are summed. Only the `advance`/payment amount is
        // counted (cash received), never the booked total/balance.
        $sumBetween = function ($query, string $col, string $amountCol) use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return (int) $query->sum($amountCol);
        };

        $autoCats = [
            ['category' => 'Room Revenue',   'value' => $sumBetween(FolioPayment::query(), 'date', 'amount')],
            ['category' => 'Group Bookings', 'value' => $sumBetween(GroupBooking::query(), 'createdAt', 'advance')],
            ['category' => 'Hall Bookings',  'value' => $sumBetween(HallBooking::query(), 'date', 'advance')],
            ['category' => 'Banquet',        'value' => $sumBetween(BanquetOrder::query(), 'date', 'advance')],
        ];
        $autoNames = ['Room Revenue', 'Group Bookings', 'Hall Bookings', 'Banquet'];

        // Manual income, minus the categories the live booking figures supersede.
        $manualIncome = $byCat('income')
            ->reject(fn ($r) => in_array($r['category'], $autoNames, true));

        $income = collect($autoCats)
            ->filter(fn ($r) => $r['value'] > 0)
            ->merge($manualIncome)
            ->sortByDesc('value')
            ->values();

        // ---- monthlyTrend: last 6 months, income (cash received) vs expense ----
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $ts = strtotime("first day of -$i month");
            $months[date('Y-m', $ts)] = ['month' => date('M', $ts), 'income' => 0, 'expense' => 0];
        }
        $addMonthly = function ($rows, string $key) use (&$months) {
            foreach ($rows as $r) {
                if (isset($months[$r->ym])) $months[$r->ym][$key] += (int) $r->v;
            }
        };
        $monthAgg = fn ($query, string $dateCol, string $amountCol) => $query
            ->selectRaw('substr("'.$dateCol.'",1,7) as ym, coalesce(sum("'.$amountCol.'"),0) as v')
            ->groupBy('ym')->get();

        $addMonthly($monthAgg(FolioPayment::query(), 'date', 'amount'), 'income');
        $addMonthly($monthAgg(GroupBooking::query(), 'createdAt', 'advance'), 'income');
        $addMonthly($monthAgg(HallBooking::query(), 'date', 'advance'), 'income');
        $addMonthly($monthAgg(BanquetOrder::query(), 'date', 'advance'), 'income');

        // account_entries dates may be non-ISO ("DD Mon"), so normalise in PHP via Carbon.
        foreach (AccountEntry::where('type', 'income')->whereNotIn('category', $autoNames)->get(['date', 'amount']) as $r) {
            $key = $this->dateBucket($r->date, 'Y-m');
            if ($key && isset($months[$key])) $months[$key]['income'] += (int) $r->amount;
        }
        foreach (AccountEntry::where('type', 'expense')->get(['date', 'amount']) as $r) {
            $key = $this->dateBucket($r->date, 'Y-m');
            if ($key && isset($months[$key])) $months[$key]['expense'] += (int) $r->amount;
        }
        $monthlyTrend = array_values($months);

        // ---- cashTrend: last 30 days, cumulative net cash movement ----
        $days = [];
        for ($i = 29; $i >= 0; $i--) {
            $days[date('Y-m-d', strtotime("-$i day"))] = 0;
        }
        $addDaily = function ($rows, int $sign) use (&$days) {
            foreach ($rows as $r) {
                if (isset($days[$r->d])) $days[$r->d] += $sign * (int) $r->v;
            }
        };
        $dayAgg = fn ($query, string $dateCol, string $amountCol) => $query
            ->selectRaw('substr("'.$dateCol.'",1,10) as d, coalesce(sum("'.$amountCol.'"),0) as v')
            ->groupBy('d')->get();

        $addDaily($dayAgg(FolioPayment::query(), 'date', 'amount'), 1);
        $addDaily($dayAgg(GroupBooking::query(), 'createdAt', 'advance'), 1);
        $addDaily($dayAgg(HallBooking::query(), 'date', 'advance'), 1);
        $addDaily($dayAgg(BanquetOrder::query(), 'date', 'advance'), 1);

        // account_entries dates may be non-ISO ("DD Mon"), so normalise in PHP via Carbon.
        foreach (AccountEntry::where('type', 'income')->whereNotIn('category', $autoNames)->get(['date', 'amount']) as $r) {
            $key = $this->dateBucket($r->date, 'Y-m-d');
            if ($key && isset($days[$key])) $days[$key] += (int) $r->amount;
        }
        foreach (AccountEntry::where('type', 'expense')->get(['date', 'amount']) as $r) {
            $key = $this->dateBucket($r->date, 'Y-m-d');
            if ($key && isset($days[$key])) $days[$key] -= (int) $r->amount;
        }

        $bal = 0; $cashTrend = []; $n = 0;
        foreach ($days as $net) {
            $bal += $net;
            $cashTrend[] = ['day' => (string) (++$n), 'balance' => $bal];
        }

        return response()->json([
            'income'      => $income,
            'incomeTotal' => (int) $income->sum('value'),
            'expense'     => $byCat('expense'),
            'recent'      => $recent,
            'monthlyTrend' => $monthlyTrend,
            'cashTrend'    => $cashTrend,
        ]);
    }

    /**
     * GET /api/accounts/departmental — real Departmental P&L.
     * Revenue mapped to departments from the same sources as accountsSummary
     * (so totals reconcile); costs split by the account_entries.department tag,
     * with untagged/General expenses + refunds as overhead.
     */
    public function departmentalPnl(\Illuminate\Http\Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $sumBetween = function ($query, string $col, string $amountCol) use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return (int) $query->sum($amountCol);
        };
        $applyRange = function ($query, string $col = 'date') use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return $query;
        };

        // ---- Revenue by department ----
        $autoNames = ['Room Revenue', 'Group Bookings', 'Hall Bookings', 'Banquet'];
        $revenue = [];
        $pushRev = function (string $category, string $dept, int $amount) use (&$revenue) {
            if ($amount > 0) $revenue[] = ['category' => $category, 'dept' => $dept, 'amount' => $amount];
        };
        $pushRev('Room Revenue', 'Rooms', $sumBetween(FolioPayment::query(), 'date', 'amount'));
        $pushRev('Group Bookings', 'Rooms', $sumBetween(GroupBooking::query(), 'createdAt', 'advance'));
        $pushRev('Hall Bookings', 'Banquet', $sumBetween(HallBooking::query(), 'date', 'advance'));
        $pushRev('Banquet', 'Banquet', $sumBetween(BanquetOrder::query(), 'date', 'advance'));

        $deptForCategory = function (string $cat): string {
            $c = strtolower($cat);
            if (str_contains($c, 'f&b') || str_contains($c, 'food') || str_contains($c, 'restaurant')) return 'F&B';
            if (str_contains($c, 'spa') || str_contains($c, 'wellness')) return 'Spa';
            return 'Other';
        };
        $incomeRows = $applyRange(AccountEntry::query()->where('type', 'income'))
            ->selectRaw('category, coalesce(sum(amount),0) as v')->groupBy('category')->get();
        foreach ($incomeRows as $r) {
            if (in_array($r->category, $autoNames, true)) continue; // superseded by live figures
            $pushRev($r->category ?: 'Other', $deptForCategory((string) $r->category), (int) $r->v);
        }

        // ---- Costs ----
        $deptSet = ['Rooms', 'F&B', 'Banquet', 'Spa', 'Other'];
        $directCosts = [];
        $overhead = [];
        $expRows = $applyRange(AccountEntry::query()->where('type', 'expense'))
            ->selectRaw('category, department, coalesce(sum(amount),0) as v')
            ->groupBy('category', 'department')->get();
        foreach ($expRows as $r) {
            $amt = (int) $r->v;
            if ($amt <= 0) continue;
            if (in_array($r->department, $deptSet, true)) {
                $directCosts[] = ['category' => $r->category ?: 'Other', 'dept' => $r->department, 'amount' => $amt];
            } else {
                $overhead[] = ['category' => $r->category ?: 'Other', 'amount' => $amt];
            }
        }
        $refunds = $sumBetween($applyRange(AccountEntry::query()->where('type', 'refund')), 'date', 'amount');
        if ($refunds > 0) $overhead[] = ['category' => 'Refunds', 'amount' => $refunds];

        $totalRevenue = array_sum(array_column($revenue, 'amount'));
        $totalDirect  = array_sum(array_column($directCosts, 'amount'));
        $totalOverhead = array_sum(array_column($overhead, 'amount'));
        $grossProfit = $totalRevenue - $totalDirect;

        return response()->json([
            'departments' => $deptSet,
            'revenue'     => array_values($revenue),
            'directCosts' => array_values($directCosts),
            'overhead'    => array_values($overhead),
            'totals' => [
                'revenue' => $totalRevenue, 'directCosts' => $totalDirect,
                'grossProfit' => $grossProfit, 'overhead' => $totalOverhead,
                'netProfit' => $grossProfit - $totalOverhead,
            ],
        ]);
    }

    /**
     * Normalise a raw date string (ISO or "DD Mon") to a bucket key using Carbon.
     * Returns null if the string is blank or unparseable.
     */
    private function dateBucket(?string $raw, string $fmt): ?string
    {
        if (!$raw) return null;
        try { return \Carbon\Carbon::parse($raw)->format($fmt); } catch (\Throwable $e) { return null; }
    }

    /**
     * GET /api/accounts/receivables — per-guest receivables aggregated from booking balances.
     * Source: bookings where balance > 0 AND status != 'cancelled'.
     * Each booking is aged by (today - checkOut); balance bucketed into current/d1_30/d31_60/d60plus.
     * Rows are aggregated per guestName and sorted by total desc.
     */
    public function receivables()
    {
        $today = now()->toDateString();

        $bookings = Booking::where('balance', '>', 0)
            ->where('status', '!=', 'cancelled')
            ->get(['guestName', 'balance', 'checkOut']);

        // Group by guestName, accumulate aging buckets
        $guestMap = [];
        foreach ($bookings as $b) {
            $name     = (string) ($b->guestName ?: 'Unknown');
            $balance  = (int) $b->balance;
            $checkOut = (string) $b->checkOut;

            // ageDays: max(0, today - checkOut) using lexicographic date comparison
            $ageDays = $checkOut < $today
                ? (int) floor((strtotime($today) - strtotime($checkOut)) / 86400)
                : 0;

            if (!isset($guestMap[$name])) {
                $guestMap[$name] = [
                    'guest'     => $name,
                    'bookings'  => 0,
                    'current'   => 0,
                    'd1_30'     => 0,
                    'd31_60'    => 0,
                    'd60plus'   => 0,
                    'total'     => 0,
                    'oldestDue' => $checkOut,
                ];
            }

            $guestMap[$name]['bookings']++;
            $guestMap[$name]['total'] += $balance;

            if ($ageDays === 0) {
                $guestMap[$name]['current'] += $balance;
            } elseif ($ageDays <= 30) {
                $guestMap[$name]['d1_30'] += $balance;
            } elseif ($ageDays <= 60) {
                $guestMap[$name]['d31_60'] += $balance;
            } else {
                $guestMap[$name]['d60plus'] += $balance;
            }

            // oldestDue = min checkOut (lexicographic)
            if ($checkOut < $guestMap[$name]['oldestDue']) {
                $guestMap[$name]['oldestDue'] = $checkOut;
            }
        }

        // Sort rows by total desc
        $rows = array_values($guestMap);
        usort($rows, fn ($a, $b) => $b['total'] <=> $a['total']);

        // Compute totals
        $totals = [
            'total'    => array_sum(array_column($rows, 'total')),
            'current'  => array_sum(array_column($rows, 'current')),
            'd1_30'    => array_sum(array_column($rows, 'd1_30')),
            'd31_60'   => array_sum(array_column($rows, 'd31_60')),
            'd60plus'  => array_sum(array_column($rows, 'd60plus')),
            'accounts' => count($rows),
        ];

        return response()->json(['rows' => $rows, 'totals' => $totals]);
    }

    /**
     * GET /api/accounts/vat — real output + input VAT from account_entries and booking income.
     * Optional `from`/`to` date filters (ISO format).
     *
     * - taxableIncome: same income basis as accountsSummary (FolioPayment + Group/Hall/Banquet
     *   advances + manual income with auto-cat de-dup).
     * - outputVat: round(taxableIncome × 0.05).
     * - inputVat: Σ (cgst + sgst + igst) on expense account_entries.
     * - netVat: outputVat − inputVat.
     * - itcBySource: expense rows grouped by category (only where cgst+sgst+igst > 0).
     */
    public function vat(\Illuminate\Http\Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        // ---- Taxable income (replicates accountsSummary income basis) ----
        $sumBetween = function ($query, string $col, string $amountCol) use ($from, $to) {
            if ($from) $query->where($col, '>=', $from);
            if ($to)   $query->where($col, '<=', $to);
            return (int) $query->sum($amountCol);
        };

        $autoNames = ['Room Revenue', 'Group Bookings', 'Hall Bookings', 'Banquet'];

        $autoCats = [
            ['category' => 'Room Revenue',   'value' => $sumBetween(FolioPayment::query(), 'date', 'amount')],
            ['category' => 'Group Bookings', 'value' => $sumBetween(GroupBooking::query(), 'createdAt', 'advance')],
            ['category' => 'Hall Bookings',  'value' => $sumBetween(HallBooking::query(), 'date', 'advance')],
            ['category' => 'Banquet',        'value' => $sumBetween(BanquetOrder::query(), 'date', 'advance')],
        ];

        $baseEntry = AccountEntry::query();
        if ($from) $baseEntry->where('date', '>=', $from);
        if ($to)   $baseEntry->where('date', '<=', $to);

        $manualIncome = (clone $baseEntry)->where('type', 'income')
            ->whereNotIn('category', $autoNames)
            ->selectRaw('category, coalesce(sum(amount),0) as value')
            ->groupBy('category')->get()
            ->map(fn ($r) => ['category' => $r->category ?: 'Other', 'value' => (int) $r->value])
            ->values();

        $income = collect($autoCats)
            ->filter(fn ($r) => $r['value'] > 0)
            ->merge($manualIncome);

        $taxableIncome = (int) $income->sum('value');
        $outputVat     = (int) round($taxableIncome * 0.05);

        // ---- Input VAT: sum cgst/sgst/igst on expense entries ----
        $expenseQuery = AccountEntry::query()->where('type', 'expense');
        if ($from) $expenseQuery->where('date', '>=', $from);
        if ($to)   $expenseQuery->where('date', '<=', $to);

        $expRows = (clone $expenseQuery)
            ->selectRaw('category, coalesce(sum(cgst),0) as cgst, coalesce(sum(sgst),0) as sgst, coalesce(sum(igst),0) as igst')
            ->groupBy('category')
            ->get()
            ->filter(fn ($r) => ((int) $r->cgst + (int) $r->sgst + (int) $r->igst) > 0)
            ->map(fn ($r) => [
                'category' => $r->category ?: 'Other',
                'cgst'     => (int) $r->cgst,
                'sgst'     => (int) $r->sgst,
                'igst'     => (int) $r->igst,
                'total'    => (int) $r->cgst + (int) $r->sgst + (int) $r->igst,
            ])
            ->values();

        $inputVat = (int) $expRows->sum('total');
        $netVat   = $outputVat - $inputVat;

        return response()->json([
            'taxableIncome' => $taxableIncome,
            'outputVat'     => $outputVat,
            'inputVat'      => $inputVat,
            'netVat'        => $netVat,
            'itcBySource'   => $expRows->all(),
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

    /**
     * Return per-room availability for a date range, excluding rooms committed
     * to individual bookings OR group rooming assignments that overlap.
     *
     * GET /room-availability?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    public function roomAvailability(Request $request)
    {
        $from = $request->query('from', date('Y-m-d'));
        $to   = $request->query('to',   date('Y-m-d', strtotime('+1 day')));

        // Individual bookings with a room number that overlap the window
        $bookedRooms = Booking::whereNotIn('status', ['cancelled', 'checked-out', 'no-show'])
            ->whereNotNull('roomNumber')
            ->where('roomNumber', '!=', 'Unassigned')
            ->where('checkIn',  '<', $to)
            ->where('checkOut', '>', $from)
            ->pluck('roomNumber')
            ->toArray();

        // Group rooming assignments for groups whose stay overlaps the window
        $groupRooms = DB::table('group_rooming')
            ->join('group_bookings', 'group_rooming.groupCode', '=', 'group_bookings.code')
            ->whereNotIn('group_bookings.status', ['cancelled'])
            ->whereNotNull('group_rooming.roomNo')
            ->where('group_rooming.roomNo', '!=', '')
            ->where('group_bookings.arrival',   '<', $to)
            ->where('group_bookings.departure', '>', $from)
            ->pluck('group_rooming.roomNo')
            ->toArray();

        $committed = array_unique(array_merge($bookedRooms, $groupRooms));

        $rooms = Room::orderBy('floor')->orderBy('number')->get()->map(function ($r) use ($committed) {
            $available = !in_array($r->number, $committed)
                && $r->status !== 'blocked'
                && $r->status !== 'out-of-order';
            return [
                'number'    => $r->number,
                'floor'     => (int) $r->floor,
                'type'      => $r->category,
                'available' => $available,
                'status'    => $r->status,
            ];
        });

        return response()->json($rooms);
    }
}
