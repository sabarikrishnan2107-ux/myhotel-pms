<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LoyaltySettingSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('loyalty_settings')->count() > 0) {
            return;
        }

        DB::table('loyalty_settings')->insert([
            [
                'name'                      => 'Pearl Privileges',
                'pointsValueRupees'         => 0.5,
                'pointsExpiryMonths'        => 24,
                'taxBeforeDiscount'         => false,
                'approvalRequiredAbove'     => 2000,
                'manualAdjustNeedsApproval' => true,
                'redemptionOtp'             => false,
                'created_at'                => now(),
                'updated_at'                => now(),
            ],
        ]);
    }
}
