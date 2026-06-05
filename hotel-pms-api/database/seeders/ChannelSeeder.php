<?php

namespace Database\Seeders;

use App\Models\Channel;
use Illuminate\Database\Seeder;

class ChannelSeeder extends Seeder
{
    public function run(): void
    {
        if (Channel::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'Booking.com', 'status' => 'connected', 'lastSync' => '2 min ago', 'bookings' => 184, 'commission' => 15, 'rev' => 162400],
            ['name' => 'Agoda', 'status' => 'connected', 'lastSync' => '5 min ago', 'bookings' => 112, 'commission' => 18, 'rev' => 98700],
            ['name' => 'Expedia', 'status' => 'connected', 'lastSync' => '8 min ago', 'bookings' => 86, 'commission' => 17, 'rev' => 74200],
            ['name' => 'MakeMyTrip', 'status' => 'connected', 'lastSync' => '12 min ago', 'bookings' => 41, 'commission' => 16, 'rev' => 32100],
            ['name' => 'Goibibo', 'status' => 'syncing', 'lastSync' => 'syncing…', 'bookings' => 28, 'commission' => 15, 'rev' => 21800],
            ['name' => 'Airbnb', 'status' => 'disconnected', 'lastSync' => '—', 'bookings' => 0, 'commission' => 14, 'rev' => 0],
        ] as $c) {
            Channel::create($c);
        }
    }
}
