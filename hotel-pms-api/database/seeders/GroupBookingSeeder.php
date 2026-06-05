<?php

namespace Database\Seeders;

use App\Models\GroupBooking;
use Illuminate\Database\Seeder;

class GroupBookingSeeder extends Seeder
{
    public function run(): void
    {
        if (GroupBooking::count() > 0) {
            return;
        }

        foreach ([
            [
                'code' => 'GRP-2401', 'name' => 'Al-Mansoori Wedding', 'type' => 'Wedding',
                'contactName' => 'Mr. Hassan Al-Mansoori', 'contactPhone' => '+971 50 111 2233', 'contactEmail' => 'hassan@almansoori.ae',
                'bookedBy' => 'Pearl Holidays (Agent)', 'arrival' => '2026-05-25', 'departure' => '2026-05-28', 'nights' => 3,
                'block' => [
                    ['type' => 'Deluxe', 'qty' => 30, 'rate' => 580, 'assigned' => 28],
                    ['type' => 'Suite', 'qty' => 6, 'rate' => 1100, 'assigned' => 6],
                    ['type' => 'King', 'qty' => 14, 'rate' => 780, 'assigned' => 14],
                ],
                'totalRooms' => 50, 'totalPax' => 110, 'ratePlan' => 'CP (Room + Breakfast)',
                'services' => ['Grand Ballroom — Reception evening', 'Airport pickup × 22', 'Vendor parking × 8'],
                'total' => 138400, 'advance' => 60000, 'balance' => 78400, 'status' => 'confirmed',
                'notes' => 'Bridal suite must be Room 605. Henna evening 25th in Pearl Hall.', 'createdAt' => '2026-04-12',
            ],
            [
                'code' => 'GRP-2402', 'name' => 'TechCorp Annual Conference', 'type' => 'Corporate Retreat',
                'contactName' => 'Ms. Anita Vora', 'contactPhone' => '+971 55 987 1234', 'contactEmail' => 'anita@techcorp.com',
                'bookedBy' => 'TechCorp FZ-LLC (Corporate)', 'arrival' => '2026-05-26', 'departure' => '2026-05-28', 'nights' => 2,
                'block' => [['type' => 'Deluxe', 'qty' => 28, 'rate' => 520, 'assigned' => 28]],
                'totalRooms' => 28, 'totalPax' => 28, 'ratePlan' => 'CP — Corporate rate',
                'services' => ['Pearl Hall — 8h × 2 days', 'Coffee breaks × 4', 'Lunch × 2', 'AV setup'],
                'total' => 41600, 'advance' => 41600, 'balance' => 0, 'status' => 'in-house',
                'notes' => 'Invoice billed to TechCorp FZ-LLC. Credit booking.', 'createdAt' => '2026-04-30',
            ],
            [
                'code' => 'GRP-2403', 'name' => 'Pearl Tours — Chennai Batch 14', 'type' => 'Tour Group',
                'contactName' => 'Mr. Suresh Iyer', 'contactPhone' => '+971 52 333 8899', 'contactEmail' => 'ops@pearltours.in',
                'bookedBy' => 'Pearl Holidays (Agent)', 'arrival' => '2026-05-27', 'departure' => '2026-05-31', 'nights' => 4,
                'block' => [
                    ['type' => 'Queen', 'qty' => 12, 'rate' => 380, 'assigned' => 8],
                    ['type' => 'Family', 'qty' => 6, 'rate' => 820, 'assigned' => 4],
                ],
                'totalRooms' => 18, 'totalPax' => 42, 'ratePlan' => 'MAP (Breakfast + Dinner)',
                'services' => ['Airport pickup × 18', 'Half-day city tour', 'Desert safari evening'],
                'total' => 56640, 'advance' => 17000, 'balance' => 39640, 'status' => 'confirmed',
                'notes' => 'Rooming list shared via WhatsApp — partial.', 'createdAt' => '2026-05-08',
            ],
            [
                'code' => 'GRP-2404', 'name' => 'Bombay Cricket Academy U-19', 'type' => 'Sports Team',
                'contactName' => 'Coach Kapoor', 'contactPhone' => '+971 56 444 7890', 'contactEmail' => 'coach@bca.in',
                'arrival' => '2026-06-01', 'departure' => '2026-06-06', 'nights' => 5,
                'block' => [['type' => 'Queen', 'qty' => 22, 'rate' => 350, 'assigned' => 0]],
                'totalRooms' => 22, 'totalPax' => 44, 'ratePlan' => 'AP (Full Board) — Long stay',
                'services' => ['Bus transfers × 4', 'Buffet dining', 'Conference room — daily 2h'],
                'total' => 77000, 'advance' => 0, 'balance' => 77000, 'status' => 'tentative',
                'notes' => 'Pending sponsor confirmation. Hold until 27 May.', 'createdAt' => '2026-05-18',
            ],
        ] as $g) {
            GroupBooking::create($g);
        }
    }
}
