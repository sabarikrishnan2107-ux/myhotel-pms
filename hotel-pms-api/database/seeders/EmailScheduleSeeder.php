<?php

namespace Database\Seeders;

use App\Models\EmailSchedule;
use Illuminate\Database\Seeder;

class EmailScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            [
                'label'      => 'Owner Daily Flash',
                'frequency'  => 'daily',
                'time'       => '08:00',
                'recipients' => ['owner@pearlmarina.com', 'gm@pearlmarina.com'],
                'format'     => 'pdf',
                'sections'   => ['KPIs', 'Revenue', 'Occupancy', 'Alerts'],
                'enabled'    => true,
                'lastSentAt' => '2026-06-13 08:00',
            ],
            [
                'label'      => 'Manager Weekly Summary',
                'frequency'  => 'weekly',
                'time'       => '09:30',
                'recipients' => ['gm@pearlmarina.com', 'accounts@pearlmarina.com'],
                'format'     => 'both',
                'sections'   => ['Revenue', 'Pickup', 'Pace', 'Forecast'],
                'enabled'    => true,
                'lastSentAt' => '2026-06-09 09:30',
            ],
            [
                'label'      => 'Accounts Monthly GST Pack',
                'frequency'  => 'monthly',
                'time'       => '07:00',
                'recipients' => ['accounts@pearlmarina.com'],
                'format'     => 'pdf',
                'sections'   => ['GST', 'TDS', 'Revenue'],
                'enabled'    => false,
                'lastSentAt' => '2026-06-01 07:00',
            ],
        ];

        foreach ($rows as $row) {
            EmailSchedule::firstOrCreate(['label' => $row['label']], $row);
        }
    }
}
