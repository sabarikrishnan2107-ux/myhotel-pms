<?php

namespace Database\Seeders;

use App\Models\WebRoom;
use Illuminate\Database\Seeder;

class WebRoomSeeder extends Seeder
{
    public function run(): void
    {
        if (WebRoom::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'Deluxe Sea View', 'price' => 650, 'image' => '🌊', 'desc' => 'King bed · 38 sqm · Marina view', 'published' => true],
            ['name' => 'Suite', 'price' => 1200, 'image' => '✨', 'desc' => 'King bed · 65 sqm · Living room · Marina view', 'published' => true],
            ['name' => 'Executive Floor', 'price' => 1500, 'image' => '🏆', 'desc' => 'King bed · 55 sqm · Lounge access', 'published' => true],
        ] as $r) {
            WebRoom::create($r);
        }
    }
}
