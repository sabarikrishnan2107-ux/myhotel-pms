<?php

namespace Database\Seeders;

use App\Models\Competitor;
use App\Models\CompetitorRate;
use Illuminate\Database\Seeder;

class CompetitorSeeder extends Seeder
{
    public function run(): void
    {
        // Transcribed from the comp-shop page (COMPETITORS + ROOM_TYPES).
        // slug → competitorId used by competitor_rates.
        $comps = [
            ['slug' => 'westin',  'hotel' => 'The Westin Mumbai Powai Lake', 'brand' => 'Marriott',     'km' => 2.4, 'stars' => 5, 'source' => 'Booking.com'],
            ['slug' => 'trident', 'hotel' => 'Trident BKC',                  'brand' => 'Oberoi',       'km' => 1.1, 'stars' => 5, 'source' => 'Agoda'],
            ['slug' => 'sahara',  'hotel' => 'Sahara Star',                  'brand' => 'Sahara Group', 'km' => 4.8, 'stars' => 5, 'source' => 'MakeMyTrip'],
            ['slug' => 'hyatt',   'hotel' => 'Hyatt Regency Mumbai',         'brand' => 'Hyatt',        'km' => 3.2, 'stars' => 5, 'source' => 'Expedia'],
            ['slug' => 'sofitel', 'hotel' => 'Sofitel Mumbai BKC',           'brand' => 'Accor',        'km' => 1.6, 'stars' => 5, 'source' => 'Booking.com'],
        ];

        // Per room-type nightly rate per competitor (current date), from ROOM_TYPES.
        $roomTypes = [
            'STD' => ['westin' => 10900, 'trident' => 13400, 'sahara' =>  9450, 'hyatt' => 10500, 'sofitel' => 14200],
            'EXC' => ['westin' => 16200, 'trident' => 19800, 'sahara' => 13900, 'hyatt' => 15500, 'sofitel' => 22500],
            'CLB' => ['westin' => 13750, 'trident' => 17100, 'sahara' => 11800, 'hyatt' => 12800, 'sofitel' => 18400],
            'PRS' => ['westin' => 38500, 'trident' => 48000, 'sahara' => 32000, 'hyatt' => 36000, 'sofitel' => 55000],
        ];
        $date = '2026-06-16';

        foreach ($comps as $c) {
            Competitor::firstOrCreate(['hotel' => $c['hotel']], [
                'brand' => $c['brand'], 'km' => $c['km'], 'stars' => $c['stars'],
                'source' => $c['source'], 'active' => true,
            ]);
            foreach ($roomTypes as $rt => $rates) {
                CompetitorRate::firstOrCreate(
                    ['competitorId' => $c['slug'], 'date' => $date, 'roomType' => $rt],
                    ['rate' => $rates[$c['slug']]],
                );
            }
        }
    }
}
