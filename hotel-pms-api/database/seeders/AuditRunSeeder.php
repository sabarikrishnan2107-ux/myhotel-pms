<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AuditRunSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('audit_runs')->count() > 0) {
            return;
        }

        $now = now();

        $steps = [
            ['name' => 'Pre-checks (cashier � HK � folios)', 'duration' => '8s',  'status' => 'ok'],
            ['name' => 'Post nightly room charges + GST',    'duration' => '12s', 'status' => 'ok'],
            ['name' => 'No-show check',                      'duration' => '5s',  'status' => 'ok'],
            ['name' => 'Roll system date forward',           'duration' => '3s',  'status' => 'ok'],
            ['name' => 'Generate Manager Flash + email',     'duration' => '9s',  'status' => 'ok'],
            ['name' => 'Lock books � backup database',       'duration' => '10s', 'status' => 'ok'],
        ];

        $rows = [
            [
                'date'         => '24 May 2026',
                'runAt'        => '00:00',
                'duration'     => '47s',
                'status'       => 'success',
                'occupancy'    => 40,
                'revenue'      => 84520,
                'noShows'      => 0,
                'cashVariance' => 0,
                'anomalies'    => json_encode([]),
                'irn'          => true,
                'backup'       => true,
                'steps'        => json_encode($steps),
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'date'         => '23 May 2026',
                'runAt'        => '00:00',
                'duration'     => '52s',
                'status'       => 'success',
                'occupancy'    => 38,
                'revenue'      => 78240,
                'noShows'      => 1,
                'cashVariance' => 0,
                'anomalies'    => json_encode([]),
                'irn'          => true,
                'backup'       => true,
                'steps'        => json_encode([
                    ['name' => 'Pre-checks (cashier � HK � folios)', 'duration' => '8s',  'status' => 'ok'],
                    ['name' => 'Post nightly room charges + GST',    'duration' => '12s', 'status' => 'ok'],
                    ['name' => 'No-show check',                      'duration' => '11s', 'status' => 'ok'],
                    ['name' => 'Roll system date forward',           'duration' => '3s',  'status' => 'ok'],
                    ['name' => 'Generate Manager Flash + email',     'duration' => '9s',  'status' => 'ok'],
                    ['name' => 'Lock books � backup database',       'duration' => '10s', 'status' => 'ok'],
                ]),
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'date'         => '22 May 2026',
                'runAt'        => '00:01',
                'duration'     => '44s',
                'status'       => 'success',
                'occupancy'    => 42,
                'revenue'      => 88700,
                'noShows'      => 0,
                'cashVariance' => 0,
                'anomalies'    => json_encode([]),
                'irn'          => true,
                'backup'       => true,
                'steps'        => json_encode($steps),
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
            [
                'date'         => '21 May 2026',
                'runAt'        => '00:00',
                'duration'     => '1m 12s',
                'status'       => 'anomaly',
                'occupancy'    => 35,
                'revenue'      => 71200,
                'noShows'      => 2,
                'cashVariance' => -500,
                'anomalies'    => json_encode([
                    'Cash drawer short ₹500 (Shift #4214 � Priya M.)',
                    '2 no-show charges not posted',
                ]),
                'irn'          => true,
                'backup'       => true,
                'steps'        => json_encode([
                    ['name' => 'Pre-checks (cashier � HK � folios)', 'duration' => '8s',  'status' => 'ok'],
                    ['name' => 'Post nightly room charges + GST',    'duration' => '12s', 'status' => 'ok'],
                    ['name' => 'No-show check',                      'duration' => '11s', 'status' => 'warn'],
                    ['name' => 'Roll system date forward',           'duration' => '3s',  'status' => 'ok'],
                    ['name' => 'Generate Manager Flash + email',     'duration' => '9s',  'status' => 'ok'],
                    ['name' => 'Lock books � backup database',       'duration' => '10s', 'status' => 'warn'],
                ]),
                'created_at'   => $now,
                'updated_at'   => $now,
            ],
        ];

        DB::table('audit_runs')->insert($rows);
    }
}
