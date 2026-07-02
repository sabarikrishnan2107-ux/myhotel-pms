<?php

namespace Database\Seeders;

use App\Models\ServiceItem;
use Illuminate\Database\Seeder;

/**
 * Room-service catalogs for the Room Rack "Order for Room" dialog — Snacks/
 * Minibar, Laundry, and Other services. Editable in Configuration → Room
 * Service & Requests. Transcribed from the former hardcoded ORDER_CATALOG
 * in rack/page.tsx.
 */
class ServiceItemSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // Snacks / Minibar
            ['kind' => 'snacks', 'name' => 'Bottled water (1L)', 'price' => 100],
            ['kind' => 'snacks', 'name' => 'Coca-Cola 330ml', 'price' => 150],
            ['kind' => 'snacks', 'name' => 'Lays / Chips pack', 'price' => 120],
            ['kind' => 'snacks', 'name' => 'Snickers / Mars bar', 'price' => 150],
            ['kind' => 'snacks', 'name' => 'Mixed nuts (200g)', 'price' => 350],
            ['kind' => 'snacks', 'name' => 'Coffee pod (Nespresso)', 'price' => 180],
            ['kind' => 'snacks', 'name' => 'Tea bags (assorted)', 'price' => 80],
            ['kind' => 'snacks', 'name' => 'Beer · Kingfisher 330ml', 'price' => 350],
            ['kind' => 'snacks', 'name' => 'Wine · House 187ml', 'price' => 650],
            ['kind' => 'snacks', 'name' => 'Whiskey · Single peg 30ml', 'price' => 450],

            // Laundry
            ['kind' => 'laundry', 'name' => 'Shirt · wash & press', 'price' => 150],
            ['kind' => 'laundry', 'name' => 'Trousers / Jeans', 'price' => 180],
            ['kind' => 'laundry', 'name' => 'Dress / Saree', 'price' => 250],
            ['kind' => 'laundry', 'name' => 'Suit / Jacket (dry-clean)', 'price' => 400],
            ['kind' => 'laundry', 'name' => 'Inner wear / Socks', 'price' => 80],
            ['kind' => 'laundry', 'name' => 'Pyjamas / Nightwear', 'price' => 150],
            ['kind' => 'laundry', 'name' => 'Bedsheet / Pillow cover', 'price' => 200],
            ['kind' => 'laundry', 'name' => 'Express (same-day) — surcharge', 'price' => 250, 'hint' => '+ 50% on items'],

            // Other services
            ['kind' => 'other', 'name' => 'Wake-up call (set time below)', 'price' => 0],
            ['kind' => 'other', 'name' => 'Newspaper delivery', 'price' => 0, 'hint' => 'Free · daily'],
            ['kind' => 'other', 'name' => 'Spa booking — 60 min', 'price' => 3500],
            ['kind' => 'other', 'name' => 'Airport drop (sedan)', 'price' => 1800],
            ['kind' => 'other', 'name' => 'Doctor on call', 'price' => 2000],
            ['kind' => 'other', 'name' => 'Babysitting (per hour)', 'price' => 800],
            ['kind' => 'other', 'name' => 'Iron + board to room', 'price' => 0, 'hint' => 'Free'],
            ['kind' => 'other', 'name' => 'Extra towels / amenities', 'price' => 0, 'hint' => 'Free'],
        ];

        foreach ($rows as $r) {
            ServiceItem::firstOrCreate(
                ['kind' => $r['kind'], 'name' => $r['name']],
                $r + ['hint' => null, 'active' => true]
            );
        }
    }
}
