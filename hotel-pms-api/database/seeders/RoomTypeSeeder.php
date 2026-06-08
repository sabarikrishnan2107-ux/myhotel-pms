<?php

namespace Database\Seeders;

use App\Models\RoomType;
use Illuminate\Database\Seeder;

class RoomTypeSeeder extends Seeder
{
    public function run(): void
    {
        if (RoomType::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'Queen', 'code' => 'QN', 'baseTariff' => 4500, 'maxAdults' => 2, 'maxChildren' => 1, 'sizeSqft' => 280, 'description' => 'Queen bed · city view', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe'], 'active' => true],
            ['name' => 'Deluxe', 'code' => 'DLX', 'baseTariff' => 6500, 'maxAdults' => 2, 'maxChildren' => 1, 'sizeSqft' => 340, 'description' => 'King bed · marina view', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe', 'Bathrobe'], 'active' => true],
            ['name' => 'Suite', 'code' => 'STE', 'baseTariff' => 12000, 'maxAdults' => 4, 'maxChildren' => 1, 'sizeSqft' => 620, 'description' => 'Separate living room · marina view', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe', 'Lounge access', 'Espresso machine'], 'active' => true],
            ['name' => 'King', 'code' => 'KNG', 'baseTariff' => 8500, 'maxAdults' => 2, 'maxChildren' => 1, 'sizeSqft' => 400, 'description' => 'King bed · high floor', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe'], 'active' => true],
            ['name' => 'Family', 'code' => 'FAM', 'baseTariff' => 9500, 'maxAdults' => 4, 'maxChildren' => 2, 'sizeSqft' => 520, 'description' => 'Two queen beds · family friendly', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe', 'Sofa bed'], 'active' => true],
            ['name' => 'Executive', 'code' => 'EXE', 'baseTariff' => 15000, 'maxAdults' => 2, 'maxChildren' => 1, 'sizeSqft' => 700, 'description' => 'Executive lounge · premium amenities', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe', 'Lounge access', 'Butler service'], 'active' => true],
            ['name' => 'Presidential', 'code' => 'PRES', 'baseTariff' => 45000, 'maxAdults' => 4, 'maxChildren' => 2, 'sizeSqft' => 1400, 'description' => 'Top-floor suite · panoramic view', 'amenities' => ['Smart TV', 'Mini-bar', 'In-room safe', 'Lounge access', 'Butler service', 'Private dining'], 'active' => true],
        ] as $rt) {
            RoomType::create($rt);
        }
    }
}
