<?php

namespace Database\Seeders;

use App\Models\KitchenAmenity;
use Illuminate\Database\Seeder;

class KitchenAmenitySeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['name' => 'Dinner Plate 10" (ceramic)', 'category' => 'Crockery', 'qty' => 240, 'unit' => 'pcs', 'purchaseDate' => '2025-11-12', 'purchasePrice' => 280, 'vendor' => 'Royal Crockery', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🍽️', 'remark' => 'Restaurant + room service set'],
            ['name' => 'Quarter Plate 7"', 'category' => 'Crockery', 'qty' => 180, 'unit' => 'pcs', 'purchaseDate' => '2025-11-12', 'purchasePrice' => 180, 'vendor' => 'Royal Crockery', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🍽️', 'remark' => 'Salad / side'],
            ['name' => 'Soup Bowl 350ml', 'category' => 'Crockery', 'qty' => 120, 'unit' => 'pcs', 'purchaseDate' => '2025-11-12', 'purchasePrice' => 150, 'vendor' => 'Royal Crockery', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🥣', 'remark' => 'Used for soups & dessert'],
            ['name' => 'Coffee Mug 200ml', 'category' => 'Crockery', 'qty' => 96, 'unit' => 'pcs', 'purchaseDate' => '2026-02-08', 'purchasePrice' => 120, 'vendor' => 'Royal Crockery', 'condition' => 'New', 'location' => 'Room Service', 'photo' => '☕', 'remark' => 'In-room tea/coffee tray'],
            ['name' => 'Tea Cup with Saucer', 'category' => 'Crockery', 'qty' => 144, 'unit' => 'set', 'purchaseDate' => '2025-08-20', 'purchasePrice' => 220, 'vendor' => 'Royal Crockery', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🍵', 'remark' => 'Breakfast service'],
            ['name' => 'Stainless Vessel 5L (curry pot)', 'category' => 'Cookware', 'qty' => 8, 'unit' => 'pcs', 'purchaseDate' => '2025-03-15', 'purchasePrice' => 2800, 'vendor' => 'Vasanth Stainless', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🍲', 'remark' => 'Daily curry prep'],
            ['name' => 'Iron Tava (heavy-duty)', 'category' => 'Cookware', 'qty' => 6, 'unit' => 'pcs', 'purchaseDate' => '2025-05-22', 'purchasePrice' => 1200, 'vendor' => 'Vasanth Stainless', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🥘', 'remark' => 'Roti / dosa'],
            ['name' => 'Pressure Cooker 10L', 'category' => 'Cookware', 'qty' => 4, 'unit' => 'pcs', 'purchaseDate' => '2025-06-10', 'purchasePrice' => 4500, 'vendor' => 'Hawkins', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🍲', 'remark' => 'Dal + chana boiling'],
            ['name' => 'Frying Pan 12" (non-stick)', 'category' => 'Cookware', 'qty' => 8, 'unit' => 'pcs', 'purchaseDate' => '2025-09-04', 'purchasePrice' => 1600, 'vendor' => 'Prestige Pro', 'condition' => 'Fair', 'location' => 'Main Kitchen', 'photo' => '🍳', 'remark' => 'Egg station, replace 2 coating worn'],
            ['name' => 'Kadhai Heavy-bottom 14"', 'category' => 'Cookware', 'qty' => 5, 'unit' => 'pcs', 'purchaseDate' => '2024-12-20', 'purchasePrice' => 2200, 'vendor' => 'Vasanth Stainless', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🍳', 'remark' => 'Deep frying station'],
            ['name' => 'Dinner Fork', 'category' => 'Cutlery', 'qty' => 360, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 60, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🍴', 'remark' => 'Standard service'],
            ['name' => 'Dinner Knife (serrated)', 'category' => 'Cutlery', 'qty' => 360, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 70, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🔪', 'remark' => 'Standard service'],
            ['name' => 'Dinner Spoon', 'category' => 'Cutlery', 'qty' => 360, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 55, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🥄', 'remark' => 'Standard service'],
            ['name' => 'Tea Spoon', 'category' => 'Cutlery', 'qty' => 240, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 35, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🥄', 'remark' => 'Tea / coffee / dessert'],
            ['name' => 'Water Glass 250ml', 'category' => 'Glassware', 'qty' => 200, 'unit' => 'pcs', 'purchaseDate' => '2025-10-02', 'purchasePrice' => 90, 'vendor' => 'Borosil', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🥛', 'remark' => 'Restaurant + banquet'],
            ['name' => 'Wine Glass (red)', 'category' => 'Glassware', 'qty' => 72, 'unit' => 'pcs', 'purchaseDate' => '2025-12-15', 'purchasePrice' => 320, 'vendor' => 'Borosil', 'condition' => 'New', 'location' => 'Bar', 'photo' => '🍷', 'remark' => 'Bar stemware'],
            ['name' => 'Whisky Tumbler', 'category' => 'Glassware', 'qty' => 60, 'unit' => 'pcs', 'purchaseDate' => '2025-12-15', 'purchasePrice' => 240, 'vendor' => 'Borosil', 'condition' => 'Good', 'location' => 'Bar', 'photo' => '🥃', 'remark' => 'Bar service'],
            ['name' => 'Electric Water Kettle 1.5L', 'category' => 'Appliances', 'qty' => 72, 'unit' => 'pcs', 'purchaseDate' => '2026-01-22', 'purchasePrice' => 1450, 'vendor' => 'Bajaj Electricals', 'condition' => 'New', 'location' => 'Room Service', 'photo' => '🫖', 'remark' => 'In-room amenity · 1 per room'],
            ['name' => 'Mixer Grinder 750W', 'category' => 'Appliances', 'qty' => 3, 'unit' => 'pcs', 'purchaseDate' => '2025-07-30', 'purchasePrice' => 6500, 'vendor' => 'Bajaj Electricals', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🔌', 'remark' => 'Wet + dry grinding'],
            ['name' => 'Induction Stove (commercial)', 'category' => 'Appliances', 'qty' => 6, 'unit' => 'pcs', 'purchaseDate' => '2025-02-18', 'purchasePrice' => 18500, 'vendor' => 'Prestige Pro', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🍳', 'remark' => 'Replacing LPG · 2 already deployed'],
            ['name' => 'Microwave Oven 30L', 'category' => 'Appliances', 'qty' => 4, 'unit' => 'pcs', 'purchaseDate' => '2025-05-05', 'purchasePrice' => 14500, 'vendor' => 'LG Electronics', 'condition' => 'Good', 'location' => 'Banquet Kitchen', 'photo' => '📡', 'remark' => 'Reheating station'],
            ['name' => 'Tea Pot 1.2L (ceramic)', 'category' => 'Crockery', 'qty' => 24, 'unit' => 'pcs', 'purchaseDate' => '2025-08-20', 'purchasePrice' => 480, 'vendor' => 'Royal Crockery', 'condition' => 'Good', 'location' => 'Restaurant', 'photo' => '🫖', 'remark' => 'Breakfast & tea service'],
            ['name' => 'Serving Ladle (steel)', 'category' => 'Utensils', 'qty' => 48, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 180, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🥄', 'remark' => 'Curry / rice serving'],
            ['name' => 'Tongs (16")', 'category' => 'Utensils', 'qty' => 24, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 220, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🥢', 'remark' => 'Grill, BBQ, serving'],
            ['name' => 'Chopping Board (color-coded)', 'category' => 'Utensils', 'qty' => 18, 'unit' => 'set', 'purchaseDate' => '2025-09-04', 'purchasePrice' => 1800, 'vendor' => 'Hygiene Pro', 'condition' => 'Good', 'location' => 'Main Kitchen', 'photo' => '🪵', 'remark' => '6 colors per HACCP'],
            ['name' => 'Food Storage Container (5L)', 'category' => 'Storage', 'qty' => 30, 'unit' => 'pcs', 'purchaseDate' => '2025-10-12', 'purchasePrice' => 320, 'vendor' => 'Tupperware', 'condition' => 'Good', 'location' => 'Pantry', 'photo' => '📦', 'remark' => 'Dry storage'],
            ['name' => 'Serving Tray (32×22cm)', 'category' => 'Utensils', 'qty' => 36, 'unit' => 'pcs', 'purchaseDate' => '2025-04-08', 'purchasePrice' => 380, 'vendor' => 'Jay Kay Steel', 'condition' => 'Good', 'location' => 'Room Service', 'photo' => '🍱', 'remark' => 'Room service & breakfast'],
        ];
        foreach ($rows as $row) {
            KitchenAmenity::firstOrCreate(['name' => $row['name']], $row);
        }
    }
}
