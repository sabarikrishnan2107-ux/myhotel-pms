<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GroupServiceSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('group_services')->count() > 0) {
            return;
        }
        $now = now();
        $rows = [
            ['Grand Ballroom (banquet)', 'Hall', 10000, false],
            ['Pearl Hall (full day)', 'Hall', 6500, false],
            ['Group breakfast buffet', 'F&B', 75, true],
            ['Group lunch buffet', 'F&B', 110, true],
            ['Group dinner buffet', 'F&B', 135, true],
            ['Airport pickup (per coach)', 'Transfer', 350, false],
            ['Decoration package', 'Decor', 4500, false],
            ['AV / Stage setup', 'AV', 2200, false],
        ];
        DB::table('group_services')->insert(array_map(fn ($r) => [
            'name' => $r[0], 'category' => $r[1], 'price' => $r[2], 'perPax' => $r[3],
            'gst' => 18, 'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ], $rows));
    }
}
