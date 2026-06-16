<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ChannelRateMapSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('channel_rate_maps')->count() > 0) {
            return;
        }

        $rows = [
            ['type' => 'Queen',     'pms' => 450,  'bdc' => 480,  'agoda' => 470,  'expedia' => 475],
            ['type' => 'Deluxe',    'pms' => 650,  'bdc' => 695,  'agoda' => 685,  'expedia' => 690],
            ['type' => 'Suite',     'pms' => 1200, 'bdc' => 1280, 'agoda' => 1270, 'expedia' => 1275],
            ['type' => 'King',      'pms' => 850,  'bdc' => 905,  'agoda' => 895,  'expedia' => 900],
            ['type' => 'Family',    'pms' => 950,  'bdc' => 1015, 'agoda' => 1005, 'expedia' => 1010],
            ['type' => 'Executive', 'pms' => 1500, 'bdc' => 1600, 'agoda' => 1590, 'expedia' => 1595],
        ];

        foreach ($rows as &$row) {
            $row['created_at'] = now();
            $row['updated_at'] = now();
        }
        unset($row);

        DB::table('channel_rate_maps')->insert($rows);
    }
}
