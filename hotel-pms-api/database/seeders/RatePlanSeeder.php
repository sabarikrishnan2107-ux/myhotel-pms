<?php

namespace Database\Seeders;

use App\Models\RatePlan;
use Illuminate\Database\Seeder;

/**
 * Standard hotel rate plans (EP/CP/MAP/AP + Corporate + Non-refundable).
 * These are the master rate plans the New Booking wizard reads from
 * /rate-plans. Hotels can edit them in Configuration → Pricing & Rate Plans.
 */
class RatePlanSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'EP',  'name' => 'European',       'inclBreakfast' => false, 'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 0,  'refundable' => true],
            ['code' => 'CP',  'name' => 'Continental',    'inclBreakfast' => true,  'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 0,  'refundable' => true],
            ['code' => 'MAP', 'name' => 'Modified American', 'inclBreakfast' => true, 'inclLunch' => false, 'inclDinner' => true,  'discountPct' => 0,  'refundable' => true],
            ['code' => 'AP',  'name' => 'American',       'inclBreakfast' => true,  'inclLunch' => true,  'inclDinner' => true,  'discountPct' => 0,  'refundable' => true],
            ['code' => 'CORP','name' => 'Corporate',      'inclBreakfast' => true,  'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 15, 'refundable' => true],
            ['code' => 'NR',  'name' => 'Non-refundable', 'inclBreakfast' => true,  'inclLunch' => false, 'inclDinner' => false, 'discountPct' => 20, 'refundable' => false],
        ];
        foreach ($rows as $r) {
            RatePlan::firstOrCreate(['code' => $r['code']], $r + ['active' => true]);
        }
    }
}
