<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\FolioAdjustment;
use Illuminate\Database\Seeder;

class FolioAdjustmentSeeder extends Seeder
{
    public function run(): void
    {
        // Attach demo comps to the first seeded booking so the folio page shows real rows.
        $bookingNo = Booking::orderBy('id')->value('bookingNo') ?? 'BK100001';

        $rows = [
            ['bookingNo' => $bookingNo, 'date' => '2026-05-24', 'type' => 'Discount',
             'description' => 'Loyalty member 10% on F&B', 'amount' => -85, 'approver' => 'Tom W. (Mgr)'],
            ['bookingNo' => $bookingNo, 'date' => '2026-05-25', 'type' => 'Comp',
             'description' => 'Comp — Welcome amenity (VIP)', 'amount' => -120, 'approver' => 'Auto · VIP policy'],
        ];

        foreach ($rows as $row) {
            FolioAdjustment::firstOrCreate(
                ['bookingNo' => $row['bookingNo'], 'description' => $row['description']],
                $row,
            );
        }
    }
}
