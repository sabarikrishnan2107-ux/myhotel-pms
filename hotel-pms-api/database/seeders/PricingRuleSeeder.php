<?php

namespace Database\Seeders;

use App\Models\PricingRule;
use Illuminate\Database\Seeder;

class PricingRuleSeeder extends Seeder
{
    public function run(): void
    {
        if (PricingRule::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'Weekend premium', 'trigger' => 'Friday, Saturday, Sunday', 'adjustment' => '+22%', 'enabled' => true, 'scope' => 'All room types'],
            ['name' => 'Festival surge', 'trigger' => 'On listed festivals', 'adjustment' => '+18%', 'enabled' => true, 'scope' => 'All room types'],
            ['name' => 'Last-minute discount', 'trigger' => 'Same-day · unsold inventory', 'adjustment' => '-15%', 'enabled' => true, 'scope' => 'Standard + Deluxe'],
            ['name' => 'Long stay discount', 'trigger' => 'Stay ≥ 5 nights', 'adjustment' => '-10%', 'enabled' => true, 'scope' => 'All room types'],
            ['name' => 'Corporate rate floor', 'trigger' => 'Booking under corp contract', 'adjustment' => 'Min ₹4,200', 'enabled' => true, 'scope' => 'Deluxe'],
            ['name' => 'Event week surge', 'trigger' => 'Within 5 km of major events', 'adjustment' => '+25%', 'enabled' => true, 'scope' => 'Suites + Villas'],
            ['name' => 'Off-season floor', 'trigger' => 'Monsoon weekdays', 'adjustment' => 'Min ₹3,800', 'enabled' => false, 'scope' => 'Standard'],
        ] as $r) {
            PricingRule::create($r);
        }
    }
}
