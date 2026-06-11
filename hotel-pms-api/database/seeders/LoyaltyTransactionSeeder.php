<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LoyaltyTransactionSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('loyalty_transactions')->count() > 0) {
            return;
        }

        $now = now();

        DB::table('loyalty_transactions')->insert([
            ['memberId' => 'lm1', 'date' => '2026-05-08', 'kind' => 'Earn', 'source' => 'Room (BK100210)', 'bookingNo' => 'BK100210', 'amount' => 1840, 'balance' => 18420, 'staff' => 'Khalid R.', 'notes' => null, 'expiresOn' => '2028-05-08', 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm2', 'date' => '2026-05-18', 'kind' => 'Earn', 'source' => 'Room + F&B', 'bookingNo' => 'BK100225', 'amount' => 1240, 'balance' => 8200, 'staff' => 'Khalid R.', 'notes' => null, 'expiresOn' => '2028-05-18', 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm3', 'date' => '2026-05-12', 'kind' => 'Earn', 'source' => 'Room', 'bookingNo' => 'BK100221', 'amount' => 980, 'balance' => 6480, 'staff' => 'Khalid R.', 'notes' => null, 'expiresOn' => '2028-05-12', 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm4', 'date' => '2026-04-21', 'kind' => 'Earn', 'source' => 'Room + Spa', 'bookingNo' => 'BK100188', 'amount' => 720, 'balance' => 4200, 'staff' => 'Khalid R.', 'notes' => null, 'expiresOn' => '2028-04-21', 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm1', 'date' => '2026-05-08', 'kind' => 'Redeem', 'source' => 'Free breakfast � 2', 'bookingNo' => null, 'amount' => -800, 'balance' => 16580, 'staff' => 'Tom W.', 'notes' => 'Applied at folio settlement', 'expiresOn' => null, 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm2', 'date' => '2026-04-12', 'kind' => 'Bonus', 'source' => 'Birthday month', 'bookingNo' => null, 'amount' => 500, 'balance' => 6960, 'staff' => 'System', 'notes' => null, 'expiresOn' => null, 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm7', 'date' => '2026-05-04', 'kind' => 'Earn', 'source' => 'Room', 'bookingNo' => 'BK100195', 'amount' => 280, 'balance' => 1840, 'staff' => 'Khalid R.', 'notes' => null, 'expiresOn' => '2028-05-04', 'created_at' => $now, 'updated_at' => $now],
            ['memberId' => 'lm6', 'date' => '2026-05-22', 'kind' => 'Earn', 'source' => 'Room (Suite)', 'bookingNo' => 'BK100242', 'amount' => 1620, 'balance' => 5240, 'staff' => 'Khalid R.', 'notes' => null, 'expiresOn' => '2028-05-22', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
