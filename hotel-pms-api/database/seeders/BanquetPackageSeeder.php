<?php

namespace Database\Seeders;

use App\Models\BanquetPackage;
use Illuminate\Database\Seeder;

/**
 * Banquet catering packages (per-pax) used by New Hall Booking. Editable in
 * Configuration → Food & Hall Packages. Transcribed from the former hardcoded
 * PACKAGES list in halls/new.
 */
class BanquetPackageSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['name' => 'Veg Royal',          'desc' => '12 starters · 6 mains · 4 desserts · live counters', 'pricePerPax' => 285, 'veg' => true],
            ['name' => 'Non-Veg Premium',    'desc' => '14 starters · 8 mains · 5 desserts · live grill',     'pricePerPax' => 365, 'veg' => false],
            ['name' => 'Continental Buffet', 'desc' => 'International cuisine · 30 dishes',                     'pricePerPax' => 425, 'veg' => false],
            ['name' => 'High Tea / Cocktail','desc' => 'Finger food · 18 items · bar service',                 'pricePerPax' => 195, 'veg' => false],
        ];
        foreach ($rows as $r) {
            BanquetPackage::firstOrCreate(['name' => $r['name']], $r + ['active' => true]);
        }
    }
}
