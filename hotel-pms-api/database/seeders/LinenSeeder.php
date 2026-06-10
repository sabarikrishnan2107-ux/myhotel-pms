<?php

namespace Database\Seeders;

use App\Models\LinenItem;
use Illuminate\Database\Seeder;

class LinenSeeder extends Seeder
{
    public function run(): void
    {
        if (LinenItem::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'Bath towels — Large', 'issued' => 142, 'returned' => 138, 'wastage' => 2, 'inUse' => 2],
            ['name' => 'Bath towels — Hand', 'issued' => 86, 'returned' => 82, 'wastage' => 1, 'inUse' => 3],
            ['name' => 'Bed sheets — King', 'issued' => 54, 'returned' => 52, 'wastage' => 0, 'inUse' => 2],
            ['name' => 'Pillow covers', 'issued' => 108, 'returned' => 105, 'wastage' => 1, 'inUse' => 2],
            ['name' => 'Bath mats', 'issued' => 48, 'returned' => 46, 'wastage' => 0, 'inUse' => 2],
        ] as $row) {
            LinenItem::create($row);
        }
    }
}
