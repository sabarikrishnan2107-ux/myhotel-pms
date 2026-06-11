<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GstReturnSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('gst_returns')->count() > 0) {
            return;
        }

        $rows = [
            ['label' => 'B2B (registered)',          'taxable' => 1850000, 'igst' => 333000, 'cgst' => 0,      'sgst' => 0],
            ['label' => 'B2C large (intra-state)',    'taxable' => 6850000, 'igst' => 0,      'cgst' => 616500, 'sgst' => 616500],
            ['label' => 'B2C small',                  'taxable' => 4250000, 'igst' => 0,      'cgst' => 382500, 'sgst' => 382500],
            ['label' => 'Export of services (zero)',  'taxable' => 85000,   'igst' => 0,      'cgst' => 0,      'sgst' => 0],
            ['label' => 'Credit / debit notes',       'taxable' => -28500,  'igst' => -5130,  'cgst' => 0,      'sgst' => 0],
        ];

        foreach ($rows as &$row) {
            $row['created_at'] = now();
            $row['updated_at'] = now();
        }
        unset($row);

        DB::table('gst_returns')->insert($rows);
    }
}
