<?php

namespace Database\Seeders;

use App\Models\HallBooking;
use Illuminate\Database\Seeder;

class HallBookingSeeder extends Seeder
{
    public function run(): void
    {
        if (HallBooking::count() > 0) {
            return;
        }

        foreach ([
            ['customer' => 'Al-Mansoori Wedding', 'phone' => '+971 50 123 4567', 'hall' => 'Grand Ballroom', 'date' => '2026-05-25', 'start' => '18:00', 'end' => '23:00', 'guests' => 280, 'package' => 'Royal Veg', 'advance' => 8000, 'total' => 22000, 'status' => 'confirmed'],
            ['customer' => 'TechCorp Annual Meet', 'phone' => '+971 55 987 1234', 'hall' => 'Pearl Hall', 'date' => '2026-05-26', 'start' => '09:00', 'end' => '17:00', 'guests' => 120, 'package' => 'Corporate Buffet', 'advance' => 5000, 'total' => 11500, 'status' => 'confirmed'],
            ['customer' => 'Patel Engagement', 'phone' => '+971 52 444 7890', 'hall' => 'Marina Suite', 'date' => '2026-05-28', 'start' => '19:00', 'end' => '22:00', 'guests' => 60, 'package' => 'Premium Veg', 'advance' => 2000, 'total' => 5400, 'status' => 'pending'],
            ['customer' => 'Khan Birthday', 'phone' => '+971 56 222 1100', 'hall' => 'Boardroom A', 'date' => '2026-05-24', 'start' => '16:00', 'end' => '20:00', 'guests' => 18, 'package' => 'Cocktail Spread', 'advance' => 1500, 'total' => 2800, 'status' => 'in-progress'],
        ] as $b) {
            HallBooking::create($b);
        }
    }
}
