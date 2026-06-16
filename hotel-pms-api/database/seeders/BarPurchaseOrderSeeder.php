<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarPurchaseOrderSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('bar_purchase_orders')->count() > 0) {
            return;
        }

        DB::table('bar_purchase_orders')->insert([
            [
                'poNo'       => 'PO-BAR-2031',
                'vendor'     => 'United Spirits Distribution',
                'items'      => 'Whisky � Vodka � Gin assortment',
                'itemCount'  => 14,
                'value'      => 184500,
                'raised'     => '28 May',
                'eta'        => '04 Jun',
                'status'     => 'In Transit',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'poNo'       => 'PO-BAR-2032',
                'vendor'     => 'Pernod Ricard India',
                'items'      => 'Chivas 18 � Absolut � Jameson',
                'itemCount'  => 8,
                'value'      => 96200,
                'raised'     => '30 May',
                'eta'        => '06 Jun',
                'status'     => 'Confirmed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'poNo'       => 'PO-BAR-2033',
                'vendor'     => 'Sula Vineyards (Direct)',
                'items'      => 'Rasa Shiraz � La Reserve x12',
                'itemCount'  => 24,
                'value'      => 43500,
                'raised'     => '01 Jun',
                'eta'        => '07 Jun',
                'status'     => 'Pending',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'poNo'       => 'PO-BAR-2034',
                'vendor'     => 'Diageo Premium',
                'items'      => 'Johnnie Walker Black x12 cases',
                'itemCount'  => 12,
                'value'      => 50400,
                'raised'     => '29 May',
                'eta'        => '03 Jun',
                'status'     => 'Delivered',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'poNo'       => 'PO-BAR-2035',
                'vendor'     => 'AB InBev India (Beer)',
                'items'      => 'Corona � Bira � Heineken cases',
                'itemCount'  => 30,
                'value'      => 68200,
                'raised'     => '31 May',
                'eta'        => '05 Jun',
                'status'     => 'In Transit',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'poNo'       => 'PO-BAR-2036',
                'vendor'     => 'William Grant & Sons',
                'items'      => 'Glenfiddich 12 � Hendrick\'s',
                'itemCount'  => 10,
                'value'      => 112800,
                'raised'     => '01 Jun',
                'eta'        => '08 Jun',
                'status'     => 'Confirmed',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
