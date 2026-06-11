<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LoyaltyRedemptionSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('loyalty_redemptions')->count() > 0) {
            return;
        }

        DB::table('loyalty_redemptions')->insert([
            [
                'date'       => '2026-05-08',
                'memberId'   => 'lm1',
                'memberName' => 'Sanjana Reddy',
                'rewardId'   => 'rw2',
                'rewardName' => 'Free breakfast for 2',
                'pointsUsed' => 800,
                'bookingNo'  => 'BK100210',
                'status'     => 'Applied',
                'staff'      => 'Khalid R.',
                'approver'   => 'Tom W.',
                'notes'      => 'Auto-approved � Diamond tier',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'date'       => '2026-05-12',
                'memberId'   => 'lm3',
                'memberName' => 'Sarah Whitfield',
                'rewardId'   => 'rw4',
                'rewardName' => 'Late checkout till 4 PM',
                'pointsUsed' => 500,
                'bookingNo'  => null,
                'status'     => 'Applied',
                'staff'      => 'Khalid R.',
                'approver'   => null,
                'notes'      => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'date'       => '2026-05-22',
                'memberId'   => 'lm6',
                'memberName' => 'Mr. Ahmed Al-Mansoori',
                'rewardId'   => 'rw6',
                'rewardName' => 'Airport pickup',
                'pointsUsed' => 1500,
                'bookingNo'  => 'BK100242',
                'status'     => 'Pending',
                'staff'      => 'Priya M.',
                'approver'   => null,
                'notes'      => 'Awaiting concierge confirmation',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'date'       => '2026-05-23',
                'memberId'   => 'lm4',
                'memberName' => 'Karan Mehta',
                'rewardId'   => 'rw8',
                'rewardName' => '₹1000 gift voucher',
                'pointsUsed' => 2000,
                'bookingNo'  => null,
                'status'     => 'Pending',
                'staff'      => 'Khalid R.',
                'approver'   => null,
                'notes'      => 'Manager approval needed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'date'       => '2026-04-30',
                'memberId'   => 'lm8',
                'memberName' => 'Rohan Joshi',
                'rewardId'   => 'rw3',
                'rewardName' => 'Spa discount 20%',
                'pointsUsed' => 600,
                'bookingNo'  => 'BK100199',
                'status'     => 'Applied',
                'staff'      => 'Khalid R.',
                'approver'   => null,
                'notes'      => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
