<?php

namespace Database\Seeders;

use App\Models\RateRestriction;
use Illuminate\Database\Seeder;

class RateRestrictionSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'fromIso' => '2026-06-07', 'toIso' => '2026-06-08', 'roomType' => 'all', 'kind' => 'minlos',
                'value' => 'MinLOS 2 nights', 'appliedBy' => 'Priya Krishnan', 'appliedAt' => '2026-05-28 11:42',
                'channels' => ['Booking.com', 'Agoda', 'MakeMyTrip', 'Direct'],
            ],
            [
                'fromIso' => '2026-06-16', 'toIso' => '2026-06-18', 'roomType' => 'all', 'kind' => 'minlos',
                'value' => 'MinLOS 3 + CTD (Festival)', 'appliedBy' => 'Karan Mehta', 'appliedAt' => '2026-05-22 09:18',
                'channels' => ['Booking.com', 'Agoda', 'MakeMyTrip', 'Expedia', 'Direct'],
            ],
            [
                'fromIso' => '2026-06-09', 'toIso' => '2026-06-09', 'roomType' => 'villa', 'kind' => 'cta',
                'value' => 'Closed to arrival', 'appliedBy' => 'Anjali Iyer', 'appliedAt' => '2026-05-30 16:05',
                'channels' => ['Booking.com', 'Agoda', 'Direct'],
            ],
            [
                'fromIso' => '2026-06-30', 'toIso' => '2026-07-02', 'roomType' => 'suite', 'kind' => 'minlos',
                'value' => 'MinLOS 2 (Long weekend)', 'appliedBy' => 'Priya Krishnan', 'appliedAt' => '2026-05-31 14:20',
                'channels' => ['Booking.com', 'MakeMyTrip', 'Direct'],
            ],
        ];

        foreach ($rows as $row) {
            RateRestriction::firstOrCreate(
                ['fromIso' => $row['fromIso'], 'kind' => $row['kind'], 'roomType' => $row['roomType'], 'value' => $row['value']],
                $row,
            );
        }
    }
}
