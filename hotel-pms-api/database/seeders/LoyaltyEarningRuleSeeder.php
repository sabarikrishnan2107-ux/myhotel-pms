<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LoyaltyEarningRuleSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('loyalty_earning_rules')->count() > 0) {
            return;
        }

        $rules = [
            ['source' => 'Room booking',          'multiplier' => 1,    'enabled' => true, 'notes' => 'Full tier rate � room subtotal'],
            ['source' => 'F&B (restaurant)',      'multiplier' => 0.5,  'enabled' => true, 'notes' => 'Half rate � charged to folio'],
            ['source' => 'Spa & wellness',        'multiplier' => 1,    'enabled' => true, 'notes' => 'Full rate � folio-charged'],
            ['source' => 'Laundry',               'multiplier' => 0.5,  'enabled' => true, 'notes' => null],
            ['source' => 'Banquet booking',       'multiplier' => 1,    'enabled' => true, 'notes' => 'Halls & events'],
            ['source' => 'Direct booking bonus',  'multiplier' => 1.3,  'enabled' => true, 'notes' => '+30% on direct bookings'],
            ['source' => 'Website booking bonus', 'multiplier' => 1.1,  'enabled' => true, 'notes' => '+10% via website widget'],
            ['source' => 'Walk-in',               'multiplier' => 1,    'enabled' => true, 'notes' => null],
            ['source' => 'OTA booking',           'multiplier' => 0.5,  'enabled' => true, 'notes' => 'Reduced earning � OTA commission paid'],
            ['source' => 'Corporate booking',     'multiplier' => 0.75, 'enabled' => true, 'notes' => 'If corporate rate plan'],
            ['source' => 'Travel agent',          'multiplier' => 0.5,  'enabled' => true, 'notes' => null],
            ['source' => 'Referral bonus',        'multiplier' => 0,    'enabled' => true, 'notes' => 'Fixed: +1000 points each side'],
            ['source' => 'Birthday bonus',        'multiplier' => 0,    'enabled' => true, 'notes' => 'Fixed: +500 in birthday month'],
            ['source' => 'Anniversary bonus',     'multiplier' => 0,    'enabled' => true, 'notes' => 'Fixed: +500 in anniversary month'],
        ];

        $rows = [];
        foreach ($rules as $rule) {
            $rows[] = $rule + [
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('loyalty_earning_rules')->insert($rows);
    }
}
