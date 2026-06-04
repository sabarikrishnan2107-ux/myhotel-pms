<?php

namespace Database\Seeders;

use App\Models\PropertySetting;
use Illuminate\Database\Seeder;

class PropertySettingSeeder extends Seeder
{
    /**
     * Seed the Property & Branch row with the values the Next.js Setup page
     * shipped with, so the migrated app looks identical on day one.
     */
    public function run(): void
    {
        PropertySetting::updateOrCreate(['id' => 1], [
            'property_name'   => 'The Pearl Palace',
            'owner_email'     => 'owner@pearlmarina.com',
            'overbooking'     => 'Blocked (manager override)',
            'branch'          => 'Main Tower · Mumbai (default)',
            'currency'        => 'INR — Indian Rupee (₹)',
            'country'         => 'India',
            'gst_state'       => 'Maharashtra (27)',
            'city'            => 'Mumbai',
            'pin_code'        => '400050',
            'checkin_time'    => '12:00 PM',
            'checkout_time'   => '11:00 AM',
            'default_advance' => 30,
            'gstin'           => '27AAACR5055K1Z5',
            'pan'             => 'AAACR5055K',
            'fssai_license'   => '11522999000123',
            'sac_code'        => '9963 (Accommodation)',
            'cin'             => 'U55101MH2018PTC123456',
            'logo'            => 'logo_240x120.png',
        ]);
    }
}
