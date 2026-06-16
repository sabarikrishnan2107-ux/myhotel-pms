<?php

namespace Database\Seeders;

use App\Models\MealPlan;
use Illuminate\Database\Seeder;

class MealPlanSeeder extends Seeder
{
    public function run(): void
    {
        // Transcribed from FB_PLANS in group-quote/page.tsx.
        $rows = [
            ['code' => 'EP',  'name' => 'Rooms only (EP)',          'perPaxPerDay' => 0,    'desc' => 'No meals included'],
            ['code' => 'CP',  'name' => 'Continental (CP)',         'perPaxPerDay' => 950,  'desc' => 'Breakfast only'],
            ['code' => 'MAP', 'name' => 'Modified American (MAP)',  'perPaxPerDay' => 2200, 'desc' => 'Breakfast + 1 meal'],
            ['code' => 'AP',  'name' => 'American Plan (AP)',       'perPaxPerDay' => 3400, 'desc' => 'All 3 meals'],
            ['code' => 'BQ',  'name' => 'Banquet inclusive',        'perPaxPerDay' => 0,    'desc' => 'Catered via banquet pkg'],
        ];
        foreach ($rows as $r) {
            MealPlan::firstOrCreate(['code' => $r['code']], $r + ['active' => true]);
        }
    }
}
