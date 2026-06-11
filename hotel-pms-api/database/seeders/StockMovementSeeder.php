<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StockMovementSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('stock_movements')->count() > 0) {
            return;
        }

        $rows = [
            ['time' => '13:48',     'itemName' => 'Bath Towels � Large',     'type' => 'Issue',   'qty' => -20, 'reason' => 'Floor 3 cleaning cycle', 'by' => 'Sunil V.'],
            ['time' => '11:12',     'itemName' => 'Mineral Water 500ml',     'type' => 'Issue',   'qty' => -48, 'reason' => 'Restock minibars',       'by' => 'Maria L.'],
            ['time' => '10:30',     'itemName' => 'Coffee Beans � Premium',  'type' => 'Receive', 'qty' => 25,  'reason' => 'PO-2450 received',       'by' => 'Fatima A.'],
            ['time' => 'Yesterday', 'itemName' => 'Shampoo 30ml',            'type' => 'Wastage', 'qty' => -12, 'reason' => 'Expired stock',          'by' => 'Sunil V.'],
            ['time' => 'Yesterday', 'itemName' => 'Bed Sheets � King',       'type' => 'Receive', 'qty' => 80,  'reason' => 'PO-2451 received',       'by' => 'Fatima A.'],
        ];

        foreach ($rows as &$row) {
            $row['created_at'] = now();
            $row['updated_at'] = now();
        }

        DB::table('stock_movements')->insert($rows);
    }
}
