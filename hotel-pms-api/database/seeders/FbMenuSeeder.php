<?php

namespace Database\Seeders;

use App\Models\MenuItem;
use Illuminate\Database\Seeder;

class FbMenuSeeder extends Seeder
{
    public function run(): void
    {
        if (MenuItem::count() > 0) {
            return;
        }
        foreach ([
            ['cat' => 'Starters', 'name' => 'Paneer Tikka', 'price' => 380, 'veg' => true, 'spice' => 'medium'],
            ['cat' => 'Starters', 'name' => 'Chicken Malai Tikka', 'price' => 460, 'veg' => false, 'spice' => 'mild', 'tag' => "Chef's pick"],
            ['cat' => 'Starters', 'name' => 'Crispy Lotus Stem', 'price' => 340, 'veg' => true],
            ['cat' => 'Mains', 'name' => 'Grilled Lamb Chops', 'price' => 1280, 'veg' => false, 'spice' => 'medium', 'tag' => 'Signature'],
            ['cat' => 'Mains', 'name' => 'Sea Bass with Lemon Butter', 'price' => 1180, 'veg' => false, 'spice' => 'mild'],
            ['cat' => 'Mains', 'name' => 'Wild Mushroom Risotto', 'price' => 720, 'veg' => true],
            ['cat' => 'Indian', 'name' => 'Butter Chicken', 'price' => 540, 'veg' => false, 'spice' => 'medium', 'tag' => 'Bestseller'],
            ['cat' => 'Indian', 'name' => 'Dal Makhani', 'price' => 320, 'veg' => true, 'spice' => 'mild'],
            ['cat' => 'Indian', 'name' => 'Rogan Josh', 'price' => 620, 'veg' => false, 'spice' => 'hot'],
            ['cat' => 'Indian', 'name' => 'Hyderabadi Biryani', 'price' => 480, 'veg' => false, 'spice' => 'hot', 'tag' => "Chef's pick"],
            ['cat' => 'Continental', 'name' => 'Margherita Pizza', 'price' => 520, 'veg' => true],
            ['cat' => 'Continental', 'name' => 'Penne Arrabiata', 'price' => 460, 'veg' => true, 'spice' => 'medium'],
            ['cat' => 'Continental', 'name' => 'Chicken Parmigiana', 'price' => 680, 'veg' => false],
            ['cat' => 'Sides', 'name' => 'Garlic Naan', 'price' => 90, 'veg' => true],
            ['cat' => 'Sides', 'name' => 'Jeera Rice', 'price' => 180, 'veg' => true],
            ['cat' => 'Sides', 'name' => 'Truffle Fries', 'price' => 320, 'veg' => true, 'tag' => 'Trending'],
            ['cat' => 'Desserts', 'name' => 'Gulab Jamun (2 pcs)', 'price' => 180, 'veg' => true],
            ['cat' => 'Desserts', 'name' => 'Tiramisu', 'price' => 380, 'veg' => true],
            ['cat' => 'Desserts', 'name' => 'Kulfi Falooda', 'price' => 260, 'veg' => true],
            ['cat' => 'Bar', 'name' => 'Old Monk Mojito', 'price' => 420, 'veg' => false],
            ['cat' => 'Bar', 'name' => 'Sula Cabernet (glass)', 'price' => 480, 'veg' => false],
            ['cat' => 'Bar', 'name' => 'Kingfisher Premium 650ml', 'price' => 320, 'veg' => false],
            ['cat' => 'Beverages', 'name' => 'Masala Chai', 'price' => 120, 'veg' => true],
            ['cat' => 'Beverages', 'name' => 'Fresh Lime Soda', 'price' => 140, 'veg' => true],
        ] as $m) {
            MenuItem::create($m);
        }
    }
}
