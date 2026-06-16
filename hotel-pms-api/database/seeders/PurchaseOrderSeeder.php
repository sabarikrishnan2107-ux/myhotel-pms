<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('purchase_orders')->count() > 0) {
            return;
        }

        DB::table('purchase_orders')->insert([
            [
                'po'         => 'PO-2452',
                'vendor'     => 'Pearl Textiles',
                'items'      => 2,
                'amount'     => 7280,
                'date'       => 'Today',
                'status'     => 'Draft',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'po'         => 'PO-2451',
                'vendor'     => 'Pearl Textiles',
                'items'      => 4,
                'amount'     => 8400,
                'date'       => '22 May',
                'status'     => 'Received',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'po'         => 'PO-2450',
                'vendor'     => 'Stumptown ME',
                'items'      => 1,
                'amount'     => 3190,
                'date'       => '20 May',
                'status'     => 'Received',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'po'         => 'PO-2449',
                'vendor'     => 'ChemServ',
                'items'      => 6,
                'amount'     => 1850,
                'date'       => '18 May',
                'status'     => 'Sent',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
