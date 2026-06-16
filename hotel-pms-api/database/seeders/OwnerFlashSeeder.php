<?php

namespace Database\Seeders;

use App\Models\AccountEntry;
use App\Models\Booking;
use App\Models\FolioCharge;
use App\Models\FolioPayment;
use App\Models\Room;
use Illuminate\Database\Seeder;

/**
 * Populates ~40 days of realistic, correctly-dated activity so the Owner's
 * Flash Dashboard (KPIs, revenue/cost breakdown, payment & guest mix, 30-day
 * trends, insights) renders with live data instead of near-empty panels.
 *
 * Everything it creates is prefixed/identifiable so it is idempotent: running
 * the seeder twice will not duplicate rows.
 */
class OwnerFlashSeeder extends Seeder
{
    /** Booking sources, weighted to a realistic channel mix. */
    private const SOURCES = [
        'OTA: Booking.com', 'OTA: Booking.com', 'OTA: Booking.com',
        'Website', 'Website', 'Website',
        'Corporate (Infosys)', 'Corporate (Infosys)',
        'OTA: MakeMyTrip', 'OTA: MakeMyTrip',
        'OTA: Agoda',
        'Walk-in',
        'Loyalty',
        'OTA: Expedia',
    ];

    private const RATES = [6000, 7500, 9000, 12000, 18000];
    private const ROOM_TYPES = ['Deluxe', 'King', 'Queen', 'Suite', 'Presidential'];
    private const PAY_MODES = ['Card', 'Card', 'UPI', 'UPI', 'Cash', 'Bank'];

    public function run(): void
    {
        // Idempotent: bail if this seeder has already run.
        if (Booking::where('bookingNo', 'like', 'OF-%')->exists()) {
            return;
        }

        $rooms = max(8, Room::count());
        $roomNumbers = Room::orderBy('number')->pluck('number')->all();
        $base = strtotime(date('Y-m-d'));
        $seq = 0;

        $bookings = [];
        $charges = [];
        $payments = [];
        $entries = [];

        // ---- Bookings + folio across the last 35 days and a few ahead ----
        for ($d = -35; $d <= 5; $d++) {
            $day = date('Y-m-d', strtotime("{$d} days", $base));
            $arrivals = random_int((int) round($rooms * 0.20), (int) round($rooms * 0.32));

            for ($a = 0; $a < $arrivals; $a++) {
                $nights = random_int(1, 3);
                $checkIn = $day;
                $checkOut = date('Y-m-d', strtotime("{$nights} days", strtotime($day)));
                $source = self::SOURCES[array_rand(self::SOURCES)];
                $rate = self::RATES[array_rand(self::RATES)];
                $total = $rate * $nights;
                $roomType = self::ROOM_TYPES[array_rand(self::ROOM_TYPES)];
                $roomNo = $roomNumbers ? (string) $roomNumbers[array_rand($roomNumbers)] : (string) random_int(101, 599);

                // Payment status — most OTA/web prepaid, walk-ins partial.
                $r = random_int(1, 100);
                [$status, $advance] = $r <= 55 ? ['paid', $total]
                    : ($r <= 85 ? ['partial', (int) round($total * 0.3)] : ['unpaid', 0]);
                $no = 'OF-' . str_pad((string) (++$seq), 5, '0', STR_PAD_LEFT);

                $bookings[] = [
                    'bookingNo' => $no, 'guestName' => $this->guestName($seq), 'roomNumber' => $roomNo,
                    'roomType' => $roomType, 'source' => $source, 'checkIn' => $checkIn, 'checkOut' => $checkOut,
                    'nights' => $nights, 'adults' => random_int(1, 3), 'children' => random_int(0, 2),
                    'paymentStatus' => $status, 'ratePlan' => 'EP', 'total' => $total,
                    'advance' => $advance, 'balance' => $total - $advance, 'vip' => random_int(1, 12) === 1,
                ];

                // Room charge (carries the room GST in the tax column).
                $charges[] = ['bookingNo' => $no, 'date' => $checkIn, 'description' => "Room — {$roomType}",
                    'type' => 'Room', 'qty' => $nights, 'rate' => $rate, 'tax' => (int) round($total * 0.12),
                    'amount' => $total, 'paidBy' => 'Guest'];

                // F&B almost always; spa/service on some stays.
                $fb = random_int(600, 3200);
                $charges[] = ['bookingNo' => $no, 'date' => $checkIn, 'description' => 'Restaurant & room service',
                    'type' => 'F&B', 'qty' => 1, 'rate' => $fb, 'tax' => (int) round($fb * 0.05),
                    'amount' => $fb, 'paidBy' => 'Guest'];
                if (random_int(1, 100) <= 35) {
                    $spa = random_int(2500, 6000);
                    $charges[] = ['bookingNo' => $no, 'date' => $checkIn, 'description' => 'Spa — wellness',
                        'type' => 'Service', 'qty' => 1, 'rate' => $spa, 'tax' => (int) round($spa * 0.18),
                        'amount' => $spa, 'paidBy' => 'Guest'];
                }

                // Payment (when money was taken) — dated at check-in.
                if ($advance > 0) {
                    $payments[] = ['bookingNo' => $no, 'date' => $checkIn,
                        'mode' => self::PAY_MODES[array_rand(self::PAY_MODES)],
                        'reference' => 'AUTO-' . $no, 'amount' => $advance];
                }
            }
        }

        // ---- Operating-cost ledger across the same window ----
        // Amounts scale with property size so GOP lands in a believable band.
        for ($d = -35; $d <= 0; $d++) {
            $day = date('Y-m-d', strtotime("{$d} days", $base));
            $dow = (int) date('N', strtotime($day));

            // Daily utilities + supplies.
            $entries[] = $this->expense($day, 'Utilities', 'Electricity, water & internet', random_int(280, 460) * $rooms, 'Bank');
            $entries[] = $this->expense($day, 'Supplies & F&B', 'Kitchen & guest supplies', random_int(380, 640) * $rooms, 'Bank');

            // Weekly payroll (Mondays).
            if ($dow === 1) {
                $entries[] = $this->expense($day, 'Payroll', 'Weekly payroll — all departments', random_int(8500, 12000) * $rooms, 'Bank');
            }
            // OTA commission settlement (a couple of times a week).
            if ($dow === 3 || $dow === 6) {
                $entries[] = $this->expense($day, 'OTA Commissions', 'Channel commission settlement', random_int(900, 1500) * $rooms, 'Bank');
            }
            // Occasional misc.
            if (random_int(1, 100) <= 25) {
                $entries[] = $this->expense($day, 'Misc', 'Repairs & sundry', random_int(50, 180) * $rooms, 'Cash');
            }
        }

        // ---- Bulk insert ----
        foreach (array_chunk($bookings, 200) as $c) { Booking::insert($this->stamp($c)); }
        foreach (array_chunk($charges, 200) as $c) { FolioCharge::insert($this->stamp($c)); }
        foreach (array_chunk($payments, 200) as $c) { FolioPayment::insert($this->stamp($c)); }
        foreach (array_chunk($entries, 200) as $c) { AccountEntry::insert($this->stamp($c)); }
    }

    private function expense(string $date, string $category, string $description, int $amount, string $mode): array
    {
        return ['date' => $date, 'type' => 'expense', 'category' => $category,
            'description' => $description, 'amount' => $amount, 'mode' => $mode, 'ref' => 'OF-EXP'];
    }

    private function guestName(int $n): string
    {
        $first = ['Arjun', 'Neha', 'Vikram', 'Ananya', 'Rahul', 'Priya', 'Karan', 'Meera', 'Sanjay', 'Divya', 'Rohan', 'Isha'];
        $last = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Mehta', 'Rao', 'Khan', 'Singh'];
        return $first[$n % count($first)] . ' ' . $last[$n % count($last)];
    }

    /** Add created_at/updated_at for raw insert() (which bypasses model timestamps). */
    private function stamp(array $rows): array
    {
        $now = date('Y-m-d H:i:s');
        return array_map(fn ($r) => $r + ['created_at' => $now, 'updated_at' => $now], $rows);
    }
}
