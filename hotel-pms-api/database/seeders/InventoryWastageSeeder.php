<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventoryWastageSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('inventory_wastage')->count() > 0) {
            return;
        }

        $now = now();

        DB::table('inventory_wastage')->insert([
            [
                'date'       => 'Yesterday',
                'item'       => 'Shampoo 30ml',
                'qty'        => 12,
                'cost'       => 48,
                'reason'     => 'Expired',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'date'       => '22 May',
                'item'       => 'Mineral Water 500ml',
                'qty'        => 24,
                'cost'       => 36,
                'reason'     => 'Broken bottles',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'date'       => '20 May',
                'item'       => 'Bath Towels � Large',
                'qty'        => 4,
                'cost'       => 112,
                'reason'     => 'Damaged in laundry',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'date'       => '18 May',
                'item'       => 'Soap Bars 25g',
                'qty'        => 60,
                'cost'       => 120,
                'reason'     => 'Discolored stock',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
