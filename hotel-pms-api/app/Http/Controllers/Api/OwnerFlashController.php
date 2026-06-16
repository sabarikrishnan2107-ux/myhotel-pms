<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountEntry;
use App\Models\AuditLog;
use App\Models\Booking;
use App\Models\EmailSchedule;
use App\Models\FbOrder;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\HallBooking;
use App\Models\Room;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Owner's Flash Dashboard — every figure aggregated from the real Postgres
 * data (bookings, folio, F&B, halls, account ledger, payments) for a chosen
 * reporting period, plus a vs-previous-period comparison.
 *
 * The JSON shape intentionally mirrors the frontend FlashData type so the
 * page can consume it directly.
 */
class OwnerFlashController extends Controller
{
    /** GET /api/owner/flash?period=today|yesterday|mtd|last_month|ytd */
    public function flash(Request $request)
    {
        $period = $request->query('period', 'today');
        [$start, $end] = $this->range($period);

        $days = $this->daysBetween($start, $end);
        $prevEnd = $this->addDays($start, -1);
        $prevStart = $this->addDays($prevEnd, -($days - 1));

        $totalRooms = max(1, Room::count());
        // Load every live (non-cancelled) booking once; both periods reuse it.
        $bookings = Booking::where('status', '!=', 'cancelled')
            ->get(['source', 'checkIn', 'checkOut', 'nights', 'total']);

        $cur = $this->bundle($start, $end, $days, $bookings, $totalRooms);
        $prev = $this->bundle($prevStart, $prevEnd, $days, $bookings, $totalRooms);

        return response()->json([
            'period'      => $period,
            'rooms'       => $cur['rooms'],
            'revenue'     => $cur['revenue'],
            'costs'       => $cur['costs'],
            'payments'    => $cur['payments'],
            'guests'      => $cur['guests'],
            'topSegments' => $cur['topSegments'],
            'vs' => [
                'revenueChange' => $this->pctChange($cur['revenue']['total'], $prev['revenue']['total']),
                'occChange'     => $this->pctChange($cur['occPct'], $prev['occPct']),
                'adrChange'     => $this->pctChange($cur['adr'], $prev['adr']),
            ],
        ]);
    }

    /** GET /api/owner/flash-trend — last 30 days of real revenue / occupancy / ADR. */
    public function flashTrend()
    {
        $totalRooms = max(1, Room::count());
        $start = $this->addDays(date('Y-m-d'), -29);
        $end = date('Y-m-d');

        $bookings = Booking::where('status', '!=', 'cancelled')
            ->get(['checkIn', 'checkOut', 'nights', 'total']);

        // Pre-aggregate F&B + hall by day in one query each.
        $fbByDate = FolioCharge::where('type', 'F&B')->whereBetween('date', [$start, $end])
            ->selectRaw('date, coalesce(sum(amount),0) as v')->groupBy('date')->pluck('v', 'date');
        $hallByDate = HallBooking::whereBetween('date', [$start, $end])
            ->selectRaw('date, coalesce(sum(total),0) as v')->groupBy('date')->pluck('v', 'date');

        $out = [];
        for ($i = 0; $i < 30; $i++) {
            $day = $this->addDays($start, $i);
            $roomRev = 0.0;
            $sold = 0;
            foreach ($bookings as $b) {
                if ($b->checkIn <= $day && $b->checkOut > $day) {
                    $sold++;
                    $roomRev += $b->total / max(1, (int) $b->nights);
                }
            }
            $dayRev = (int) round($roomRev) + (int) ($fbByDate[$day] ?? 0) + (int) ($hallByDate[$day] ?? 0);
            $out[] = [
                'day'     => $i + 1,
                'revenue' => $dayRev,
                'occ'     => (int) round(min($sold, $totalRooms) / $totalRooms * 100),
                'adr'     => $sold > 0 ? (int) round($roomRev / $sold) : 0,
            ];
        }

        return response()->json($out);
    }

    /** GET /api/owner/flash-insights — narrative insights computed from real data. */
    public function flashInsights()
    {
        $totalRooms = max(1, Room::count());
        $today = date('Y-m-d');
        $allBookings = Booking::where('status', '!=', 'cancelled')
            ->get(['source', 'checkIn', 'checkOut', 'nights', 'total']);

        // --- Weekend vs weekday revenue over the last 30 days ---
        $start = $this->addDays($today, -29);
        $wkndRev = 0.0; $wkndDays = 0; $wdayRev = 0.0; $wdayDays = 0;
        for ($i = 0; $i < 30; $i++) {
            $day = $this->addDays($start, $i);
            $rev = 0.0;
            foreach ($allBookings as $b) {
                if ($b->checkIn <= $day && $b->checkOut > $day) {
                    $rev += $b->total / max(1, (int) $b->nights);
                }
            }
            if ((int) date('N', strtotime($day)) >= 5) { $wkndRev += $rev; $wkndDays++; }
            else { $wdayRev += $rev; $wdayDays++; }
        }
        $wkndAvg = $wkndDays ? $wkndRev / $wkndDays : 0;
        $wdayAvg = $wdayDays ? $wdayRev / $wdayDays : 0;
        $weekendUplift = $wdayAvg > 0 ? (int) round(($wkndAvg - $wdayAvg) / $wdayAvg * 100) : 0;

        // --- This month vs last month ---
        $tmStart = date('Y-m-01'); $tmEnd = $today;
        $lmStart = date('Y-m-01', strtotime('first day of last month'));
        $lmEnd = date('Y-m-t', strtotime('last day of last month'));
        $tm = $this->bundle($tmStart, $tmEnd, $this->daysBetween($tmStart, $tmEnd), $allBookings, $totalRooms);
        $lm = $this->bundle($lmStart, $lmEnd, $this->daysBetween($lmStart, $lmEnd), $allBookings, $totalRooms);

        $insights = [];

        if ($weekendUplift !== 0) {
            $insights[] = ['dir' => $weekendUplift > 0 ? 'up' : 'down',
                'text' => 'Weekends (Fri–Sun) ' . ($weekendUplift > 0 ? 'drive ' . $weekendUplift . '% higher' : 'run ' . abs($weekendUplift) . '% lower') . ' revenue than weekdays' . ($weekendUplift > 0 ? ' · consider weekend premium pricing' : '')];
        }

        $adrCh = $this->pctChange($tm['adr'], $lm['adr']);
        if ($lm['adr'] > 0) {
            $insights[] = ['dir' => $adrCh >= 0 ? 'up' : 'down',
                'text' => 'ADR ' . ($adrCh >= 0 ? 'up' : 'down') . ' ' . abs($adrCh) . '% MoM (₹' . number_format($lm['adr']) . ' → ₹' . number_format($tm['adr']) . ')'];
        }

        $occCh = $this->pctChange($tm['occPct'], $lm['occPct']);
        if ($lm['occPct'] > 0) {
            $insights[] = ['dir' => $occCh >= 0 ? 'up' : 'down',
                'text' => 'Occupancy ' . ($occCh >= 0 ? 'up' : 'down') . ' ' . abs($occCh) . '% MoM (' . $lm['occPct'] . '% → ' . $tm['occPct'] . '%)'];
        }

        if ($tm['costs']['otaCommission'] > 0 && $tm['revenue']['total'] > 0) {
            $otaShare = round($tm['costs']['otaCommission'] / $tm['revenue']['total'] * 100, 1);
            $insights[] = ['dir' => 'down',
                'text' => 'OTA commission is ' . $otaShare . '% of revenue this month · push more direct bookings'];
        }

        $walkCh = $this->pctChange($tm['guests']['walkIn'], $lm['guests']['walkIn']);
        if ($lm['guests']['walkIn'] > 0) {
            $insights[] = ['dir' => $walkCh >= 0 ? 'up' : 'down',
                'text' => 'Walk-ins ' . ($walkCh >= 0 ? 'up' : 'down') . ' ' . abs($walkCh) . '% MoM'];
        }

        if ($tm['revenue']['rooms'] > 0 && $tm['revenue']['fb'] > 0) {
            $attach = (int) round($tm['revenue']['fb'] / $tm['revenue']['rooms'] * 100);
            $insights[] = ['dir' => $attach >= 35 ? 'up' : 'down',
                'text' => 'F&B attach rate at ' . $attach . '% of room revenue' . ($attach >= 35 ? ' (above 35% target)' : ' (below 35% target)')];
        }

        return response()->json($insights);
    }

    /**
     * POST /api/owner/flash/send — record a manual / scheduled send.
     * (Real SMTP delivery is wired separately; this persists the action and
     * stamps lastSentAt so the UI reflects reality.)
     */
    public function send(Request $request)
    {
        $data = $request->validate([
            'recipients'   => 'array',
            'recipients.*' => 'string|max:255',
            'scheduleId'   => 'nullable',
        ]);

        $recipients = $data['recipients'] ?? [];
        $stamp = date('Y-m-d H:i');

        $schedule = null;
        if (! empty($data['scheduleId'])) {
            $schedule = EmailSchedule::find($data['scheduleId']);
            if ($schedule) {
                $schedule->update(['lastSentAt' => $stamp]);
                if (empty($recipients)) {
                    $recipients = (array) $schedule->recipients;
                }
            }
        }

        AuditLog::record([
            'module' => 'Owner Flash',
            'action' => 'Report sent',
            'entity' => $schedule?->label ?? ('Manual · ' . count($recipients) . ' recipient(s)'),
            'after'  => implode(', ', $recipients),
        ], $request);

        return response()->json([
            'sent'       => true,
            'at'         => $stamp,
            'recipients' => $recipients,
            'schedule'   => $schedule,
        ]);
    }

    // ------------------------------------------------------------------
    // Aggregation
    // ------------------------------------------------------------------

    /** Full metric bundle for an inclusive [$start, $end] date range. */
    private function bundle(string $start, string $end, int $days, Collection $bookings, int $totalRooms): array
    {
        $endPlus1 = $this->addDays($end, 1);

        $roomRev = 0.0;
        $soldNights = 0;
        $guests = ['walkIn' => 0, 'ota' => 0, 'corporate' => 0, 'direct' => 0, 'loyalty' => 0];
        $segments = [];

        foreach ($bookings as $b) {
            $bStart = $b->checkIn > $start ? $b->checkIn : $start;
            $bEnd = $b->checkOut < $endPlus1 ? $b->checkOut : $endPlus1;
            $overlap = $this->daysBetweenExclusive($bStart, $bEnd);
            if ($overlap <= 0) {
                continue;
            }
            $nightly = $b->total / max(1, (int) $b->nights);
            $value = $nightly * $overlap;
            $roomRev += $value;
            $soldNights += $overlap;
            $guests[$this->guestBucket($b->source)] += $overlap;
            $name = $b->source ?: 'Direct';
            $segments[$name] = ($segments[$name] ?? 0) + $value;
        }

        $roomRev = (int) round($roomRev);

        // Other revenue streams, attributed by their own date within the range.
        $fb = (int) FolioCharge::where('type', 'F&B')->whereBetween('date', [$start, $end])->sum('amount')
            + (int) FbOrder::whereRaw('created_at::date between ? and ?', [$start, $end])->sum('total');
        $banquet = (int) HallBooking::whereBetween('date', [$start, $end])->sum('total');
        $other = max(0, (int) FolioCharge::whereIn('type', ['Service', 'Extra', 'Spa'])
            ->whereBetween('date', [$start, $end])->sum('amount'));
        $tax = (int) FolioCharge::whereBetween('date', [$start, $end])->sum('tax');

        $revenueTotal = $roomRev + $fb + $banquet + $other + $tax;

        // Operating costs from the real expense ledger, bucketed by category.
        $costs = ['payroll' => 0, 'otaCommission' => 0, 'utilities' => 0, 'supplies' => 0, 'misc' => 0];
        foreach (AccountEntry::where('type', 'expense')->whereBetween('date', [$start, $end])->get(['category', 'amount']) as $e) {
            $costs[$this->costBucket($e->category)] += (int) $e->amount;
        }
        $costs['total'] = array_sum($costs);

        // Payment mix from real folio payments.
        $payments = ['cash' => 0, 'card' => 0, 'upi' => 0, 'bank' => 0];
        foreach (FolioPayment::whereBetween('date', [$start, $end])->get(['mode', 'amount']) as $p) {
            $payments[$this->payBucket($p->mode)] += (int) $p->amount;
        }

        // Top revenue segments by source.
        arsort($segments);
        $topSegments = [];
        foreach (array_slice($segments, 0, 5, true) as $name => $rev) {
            $rev = (int) round($rev);
            $topSegments[] = [
                'name'    => $name,
                'revenue' => $rev,
                'share'   => $revenueTotal > 0 ? (int) round($rev / $revenueTotal * 100) : 0,
            ];
        }

        $capacity = max(1, $totalRooms * $days);
        $occPct = round(min($soldNights, $capacity) / $capacity * 100, 1);
        $adr = $soldNights > 0 ? (int) round($roomRev / $soldNights) : 0;

        return [
            'rooms'       => ['total' => $totalRooms * $days, 'sold' => $soldNights],
            'revenue'     => ['rooms' => $roomRev, 'fb' => $fb, 'banquet' => $banquet, 'other' => $other, 'tax' => $tax, 'total' => $revenueTotal],
            'costs'       => $costs,
            'payments'    => $payments,
            'guests'      => $guests,
            'topSegments' => $topSegments,
            'occPct'      => $occPct,
            'adr'         => $adr,
        ];
    }

    // ------------------------------------------------------------------
    // Bucketing
    // ------------------------------------------------------------------

    private function guestBucket(?string $source): string
    {
        $s = strtolower((string) $source);
        return match (true) {
            str_contains($s, 'walk') => 'walkIn',
            (bool) preg_match('/loyal|member|platinum|gold tier/', $s) => 'loyalty',
            (bool) preg_match('/corp|company|infosys|tech/', $s) => 'corporate',
            (bool) preg_match('/booking|agoda|makemytrip|make my trip|expedia|goibibo|ota|trip|yatra/', $s) => 'ota',
            default => 'direct',
        };
    }

    private function costBucket(?string $category): string
    {
        $c = strtolower((string) $category);
        return match (true) {
            (bool) preg_match('/payroll|salar|wage|staff|hr/', $c) => 'payroll',
            (bool) preg_match('/ota|commission|channel|booking\.com|agoda|expedia/', $c) => 'otaCommission',
            (bool) preg_match('/utilit|electric|power|water|gas|internet|telecom|fuel/', $c) => 'utilities',
            (bool) preg_match('/suppl|f&b|food|beverage|kitchen|linen|amenit|inventory|purchase|laundry/', $c) => 'supplies',
            default => 'misc',
        };
    }

    private function payBucket(?string $mode): string
    {
        $m = strtolower((string) $mode);
        return match (true) {
            str_contains($m, 'cash') => 'cash',
            str_contains($m, 'upi') => 'upi',
            (bool) preg_match('/card|pos|credit|debit|visa|master|amex|rupay/', $m) => 'card',
            default => 'bank',
        };
    }

    // ------------------------------------------------------------------
    // Date helpers (dates are stored as 'Y-m-d' strings throughout the app)
    // ------------------------------------------------------------------

    /** @return array{0:string,1:string} inclusive [start, end] for the period. */
    private function range(string $period): array
    {
        $today = date('Y-m-d');
        return match ($period) {
            'yesterday'  => [$this->addDays($today, -1), $this->addDays($today, -1)],
            'mtd'        => [date('Y-m-01'), $today],
            'last_month' => [date('Y-m-01', strtotime('first day of last month')), date('Y-m-t', strtotime('last day of last month'))],
            'ytd'        => [date('Y-01-01'), $today],
            default      => [$today, $today], // today
        };
    }

    private function addDays(string $date, int $delta): string
    {
        return date('Y-m-d', strtotime($date) + $delta * 86400);
    }

    /** Inclusive day count between two 'Y-m-d' dates. */
    private function daysBetween(string $start, string $end): int
    {
        return (int) floor((strtotime($end) - strtotime($start)) / 86400) + 1;
    }

    /** Exclusive-end night count (clamped at 0). */
    private function daysBetweenExclusive(string $start, string $endExclusive): int
    {
        return max(0, (int) floor((strtotime($endExclusive) - strtotime($start)) / 86400));
    }

    private function pctChange(float $current, float $previous): float
    {
        if ($previous <= 0) {
            return 0.0;
        }
        return round(($current - $previous) / $previous * 100, 1);
    }
}
