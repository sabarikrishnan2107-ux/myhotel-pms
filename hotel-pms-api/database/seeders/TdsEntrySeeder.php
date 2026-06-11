<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TdsEntrySeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('tds_entries')->count() > 0) {
            return;
        }

        $rows = [
            ['section' => '194C', 'description' => 'Housekeeping contract � Sparkle Cleaners', 'partyType' => 'Contractor',   'amount' => 285000,  'rate' => 2,   'tds' => 5700],
            ['section' => '194I', 'description' => 'Office space rent',                        'partyType' => 'Landlord',     'amount' => 125000,  'rate' => 10,  'tds' => 12500],
            ['section' => '194J', 'description' => 'CA fees � KPMG audit',                     'partyType' => 'Professional', 'amount' => 85000,   'rate' => 10,  'tds' => 8500],
            ['section' => '194H', 'description' => 'Commission � Travel agent Kesari',         'partyType' => 'Agent',        'amount' => 145000,  'rate' => 5,   'tds' => 7250],
            ['section' => '194Q', 'description' => 'Bulk linen purchase � Welspun Mills',      'partyType' => 'Supplier',     'amount' => 425000,  'rate' => 0.1, 'tds' => 425],
            ['section' => '194O', 'description' => 'E-commerce ops � Booking.com commission',  'partyType' => 'E-com op',     'amount' => 1280000, 'rate' => 1,   'tds' => 12800],
        ];

        $now = now();
        $rows = array_map(function ($r) use ($now) {
            $r['created_at'] = $now;
            $r['updated_at'] = $now;
            return $r;
        }, $rows);

        DB::table('tds_entries')->insert($rows);
    }
}
