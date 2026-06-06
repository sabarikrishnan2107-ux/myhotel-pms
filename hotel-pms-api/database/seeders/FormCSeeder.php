<?php

namespace Database\Seeders;

use App\Models\FormCRegistration;
use Illuminate\Database\Seeder;

class FormCSeeder extends Seeder
{
    public function run(): void
    {
        if (FormCRegistration::count() > 0) {
            return;
        }

        foreach ([
            ['guestName' => 'Mr. Lee Chang', 'passportNo' => 'EE3812746', 'nationality' => 'China', 'visaNo' => 'VC8821', 'visaExpiry' => '2026-08-15', 'arrivalAt' => '2026-05-26 16:00', 'departureAt' => '2026-05-29 11:00', 'roomNo' => '1201', 'reportedToFrro' => true, 'reportedAt' => '2026-05-26 17:12'],
            ['guestName' => 'Mr. Ahmed Al-Hassan', 'passportNo' => 'SA9912045', 'nationality' => 'Saudi Arabia', 'visaNo' => 'VS-7821', 'visaExpiry' => '2026-12-01', 'arrivalAt' => '2026-05-25 14:00', 'departureAt' => '2026-05-28 12:00', 'roomNo' => '508', 'reportedToFrro' => true, 'reportedAt' => '2026-05-25 14:45'],
            ['guestName' => 'Mrs. Sarah Whitfield', 'passportNo' => 'P1238765', 'nationality' => 'UK', 'visaNo' => 'TR-WH-21', 'visaExpiry' => '2026-06-20', 'arrivalAt' => '2026-05-24 19:30', 'departureAt' => '2026-05-26 11:00', 'roomNo' => '412', 'reportedToFrro' => true, 'reportedAt' => '2026-05-24 20:15'],
            ['guestName' => 'Mr. James Patrick', 'passportNo' => 'AU7745812', 'nationality' => 'Australia', 'visaNo' => 'TR-AUS-92', 'visaExpiry' => '2026-07-10', 'arrivalAt' => '2026-05-26 09:00', 'departureAt' => '2026-05-30 11:00', 'roomNo' => '615', 'reportedToFrro' => false],
            ['guestName' => 'Ms. Yui Tanaka', 'passportNo' => 'TK4498712', 'nationality' => 'Japan', 'visaNo' => 'VJ-2026', 'visaExpiry' => '2026-09-30', 'arrivalAt' => '2026-05-25 11:20', 'departureAt' => '2026-05-27 11:00', 'roomNo' => '308', 'reportedToFrro' => true, 'reportedAt' => '2026-05-25 12:00'],
        ] as $f) {
            FormCRegistration::create($f);
        }
    }
}
