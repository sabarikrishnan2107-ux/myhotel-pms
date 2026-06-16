<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarPourCostSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('bar_pour_costs')->count() > 0) {
            return;
        }

        $rows = [
            ['category' => 'Whisky',  'soldValue' => 485000, 'theoreticalCost' => 92000, 'actualCost' => 108500],
            ['category' => 'Vodka',   'soldValue' => 268000, 'theoreticalCost' => 51000, 'actualCost' => 53800],
            ['category' => 'Gin',     'soldValue' => 312000, 'theoreticalCost' => 58000, 'actualCost' => 60200],
            ['category' => 'Rum',     'soldValue' => 184000, 'theoreticalCost' => 32000, 'actualCost' => 33400],
            ['category' => 'Wine',    'soldValue' => 226000, 'theoreticalCost' => 47000, 'actualCost' => 47600],
            ['category' => 'Beer',    'soldValue' => 198000, 'theoreticalCost' => 41200, 'actualCost' => 41800],
            ['category' => 'Liqueur', 'soldValue' => 86000,  'theoreticalCost' => 16400, 'actualCost' => 17100],
            ['category' => 'Soft',    'soldValue' => 62000,  'theoreticalCost' => 9800,  'actualCost' => 9900],
        ];

        foreach ($rows as &$row) {
            $row['created_at'] = now();
            $row['updated_at'] = now();
        }
        unset($row);

        DB::table('bar_pour_costs')->insert($rows);
    }
}
