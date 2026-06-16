<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarVarianceSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('bar_variances')->count() > 0) {
            return;
        }

        $rows = [
            ['sku' => 'Glenfiddich 12 YO', 'category' => 'Whisky', 'theoreticalMl' => 2250, 'actualMl' => 3120, 'unitCost' => 6800, 'flag' => 'over', 'note' => 'Over-pour suspected � possible theft / 60ml pours instead of 30ml'],
            ['sku' => 'Macallan 12 Double Cask', 'category' => 'Whisky', 'theoreticalMl' => 900, 'actualMl' => 1180, 'unitCost' => 12500, 'flag' => 'watch', 'note' => 'Bottle weight short by 280ml � investigate'],
            ['sku' => 'Grey Goose Original', 'category' => 'Vodka', 'theoreticalMl' => 1800, 'actualMl' => 1950, 'unitCost' => 5600, 'flag' => 'watch', 'note' => 'Slight over-pour on Cosmopolitans'],
            ['sku' => "Hendrick's", 'category' => 'Gin', 'theoreticalMl' => 1500, 'actualMl' => 1620, 'unitCost' => 4900, 'flag' => 'watch', 'note' => 'G&T mixology variance'],
            ['sku' => 'Bombay Sapphire', 'category' => 'Gin', 'theoreticalMl' => 2400, 'actualMl' => 2510, 'unitCost' => 2800, 'flag' => 'ok', 'note' => 'Within tolerance'],
            ['sku' => 'Absolut Blue', 'category' => 'Vodka', 'theoreticalMl' => 3300, 'actualMl' => 3370, 'unitCost' => 2200, 'flag' => 'ok', 'note' => 'Within tolerance'],
            ['sku' => 'Bacardi White', 'category' => 'Rum', 'theoreticalMl' => 2700, 'actualMl' => 2790, 'unitCost' => 1280, 'flag' => 'ok', 'note' => 'Within tolerance'],
            ['sku' => 'Old Monk 7 YO', 'category' => 'Rum', 'theoreticalMl' => 3600, 'actualMl' => 3680, 'unitCost' => 380, 'flag' => 'ok', 'note' => 'Within tolerance'],
        ];

        $now = now();
        foreach ($rows as &$row) {
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
        }
        unset($row);

        DB::table('bar_variances')->insert($rows);
    }
}
