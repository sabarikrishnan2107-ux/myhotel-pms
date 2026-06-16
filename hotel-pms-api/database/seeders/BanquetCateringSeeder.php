<?php

namespace Database\Seeders;

use App\Models\FbPackage;
use App\Models\HallPackage;
use Illuminate\Database\Seeder;

/**
 * Group-pricing reference data: banquet catering tiers (reuse fb_packages) and
 * banquet venues (reuse hall_packages). Transcribed from BANQUET_PKGS and
 * BANQUET_VENUES in group-quote/page.tsx.
 */
class BanquetCateringSeeder extends Seeder
{
    public function run(): void
    {
        // Banquet catering packages → fb_packages (price = per-pax).
        $packages = [
            ['name' => 'Silver',   'price' => 1850],
            ['name' => 'Gold',     'price' => 2650],
            ['name' => 'Platinum', 'price' => 3850],
        ];
        foreach ($packages as $p) {
            FbPackage::firstOrCreate(
                ['name' => $p['name']],
                ['type' => 'Banquet', 'pax' => 1, 'price' => $p['price'], 'gst' => 5, 'active' => true],
            );
        }

        // Banquet venues → hall_packages (name + capacity).
        $venues = [
            ['name' => 'Pearl Grand Ballroom', 'capacity' => 450],
            ['name' => 'Marina Hall',          'capacity' => 250],
            ['name' => 'Lotus Lawn',           'capacity' => 600],
            ['name' => 'Emerald Conference',   'capacity' => 120],
        ];
        foreach ($venues as $v) {
            HallPackage::firstOrCreate(
                ['name' => $v['name']],
                ['capacity' => $v['capacity'], 'hourly' => 0, 'halfDay' => 0, 'fullDay' => 0, 'setupFee' => 0, 'gst' => 18, 'active' => true],
            );
        }
    }
}
