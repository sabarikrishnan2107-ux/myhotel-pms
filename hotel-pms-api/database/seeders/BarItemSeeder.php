<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarItemSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('bar_items')->count() > 0) {
            return;
        }

        $items = [
            ['Glenfiddich 12 YO', 'Whisky', '750ml', 1, 4, 6, 6, 6800],
            ['Johnnie Walker Black Label', 'Whisky', '750ml', 1, 8, 8, 12, 4200],
            ['Chivas Regal 18', 'Whisky', '750ml', 0, 3, 4, 4, 9500],
            ['Macallan 12 Double Cask', 'Whisky', '750ml', 1, 2, 4, 6, 12500],
            ['Amrut Fusion Single Malt', 'Whisky', '750ml', 1, 5, 6, 6, 3800],
            ['Paul John Brilliance', 'Whisky', '750ml', 0, 4, 4, 6, 3200],
            ['Jameson Irish Whiskey', 'Whisky', '750ml', 1, 6, 6, 6, 3400],
            ['Grey Goose Original', 'Vodka', '750ml', 1, 5, 6, 6, 5600],
            ['Absolut Blue', 'Vodka', '750ml', 1, 9, 8, 12, 2200],
            ['Belvedere Pure', 'Vodka', '750ml', 0, 3, 4, 6, 6400],
            ['Smirnoff Red', 'Vodka', '750ml', 2, 11, 10, 12, 1450],
            ['Bombay Sapphire', 'Gin', '750ml', 1, 7, 8, 8, 2800],
            ['Tanqueray London Dry', 'Gin', '750ml', 0, 4, 6, 6, 3100],
            ["Hendrick's", 'Gin', '750ml', 1, 3, 4, 6, 4900],
            ['Greater Than Indian Dry', 'Gin', '750ml', 1, 6, 6, 6, 1850],
            ['Stranger & Sons', 'Gin', '750ml', 1, 2, 4, 6, 2650],
            ['Bacardi White', 'Rum', '750ml', 1, 8, 8, 12, 1280],
            ['Captain Morgan Spiced', 'Rum', '750ml', 0, 5, 6, 6, 2100],
            ['Old Monk 7 YO', 'Rum', '750ml', 2, 10, 8, 12, 380],
            ['Sula Rasa Shiraz', 'Wine', '750ml', 0, 14, 12, 12, 1650],
            ['Grover La Reserve', 'Wine', '750ml', 1, 8, 8, 12, 1950],
            ['Fratelli Sangiovese Bianco', 'Wine', '750ml', 0, 6, 8, 12, 1480],
            ['Mo�t & Chandon Brut Imperial', 'Wine', '750ml', 0, 2, 4, 6, 8200],
            ['Heineken', 'Beer', '650ml', 0, 48, 60, 96, 240],
            ['Corona Extra', 'Beer', '355ml', 0, 36, 48, 72, 285],
            ['Bira 91 White', 'Beer', '330ml', 0, 72, 60, 96, 165],
            ['Kingfisher Premium', 'Beer', '650ml', 0, 84, 72, 120, 175],
            ['Baileys Irish Cream', 'Liqueur', '750ml', 1, 3, 4, 6, 3200],
            ['Cointreau', 'Liqueur', '700ml', 1, 2, 4, 4, 3850],
            ['Kahlua Coffee Liqueur', 'Liqueur', '700ml', 1, 3, 4, 6, 2950],
            ['Schweppes Tonic Water', 'Soft', '200ml', 0, 96, 120, 144, 60],
            ['Red Bull Energy', 'Soft', '250ml', 0, 64, 72, 96, 110],
        ];

        $now = now();
        $rows = [];
        foreach ($items as [$brand, $category, $size, $opened, $sealed, $par, $reorderQty, $unitCost]) {
            $rows[] = [
                'brand'      => $brand,
                'category'   => $category,
                'size'       => $size,
                'opened'     => $opened,
                'sealed'     => $sealed,
                'par'        => $par,
                'reorderQty' => $reorderQty,
                'unitCost'   => $unitCost,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('bar_items')->insert($rows);
    }
}
