<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BarCocktailSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('bar_cocktails')->count() > 0) {
            return;
        }

        $cocktails = [
            // [name, category, menuPrice, glassCost, recipe]
            ['Old Fashioned', 'Classic', 750, 25, [
                ['item' => 'Bourbon (Jameson sub)', 'qtyMl' => 60, 'costPerMl' => 4.533333333333333],
                ['item' => 'Sugar syrup', 'qtyMl' => 10, 'costPerMl' => 0.4],
                ['item' => 'Angostura bitters', 'qtyMl' => 2, 'costPerMl' => 8],
            ]],
            ['Negroni', 'Classic', 780, 25, [
                ['item' => 'Bombay Sapphire', 'qtyMl' => 30, 'costPerMl' => 3.7333333333333334],
                ['item' => 'Campari', 'qtyMl' => 30, 'costPerMl' => 4.2],
                ['item' => 'Sweet Vermouth', 'qtyMl' => 30, 'costPerMl' => 1.8],
            ]],
            ['Pearl Marina Martini', 'Signature', 950, 35, [
                ['item' => 'Grey Goose', 'qtyMl' => 60, 'costPerMl' => 7.466666666666667],
                ['item' => 'Dry Vermouth', 'qtyMl' => 10, 'costPerMl' => 1.6],
                ['item' => 'Olive brine', 'qtyMl' => 5, 'costPerMl' => 0.5],
            ]],
            ['Bombay Sling', 'Signature', 825, 30, [
                ['item' => 'Stranger & Sons', 'qtyMl' => 45, 'costPerMl' => 3.533333333333333],
                ['item' => 'Cherry Heering', 'qtyMl' => 15, 'costPerMl' => 3.8],
                ['item' => 'Pineapple juice', 'qtyMl' => 60, 'costPerMl' => 0.18],
                ['item' => 'Lime juice', 'qtyMl' => 15, 'costPerMl' => 0.12],
            ]],
            ['Cosmopolitan', 'Classic', 720, 25, [
                ['item' => 'Absolut Blue', 'qtyMl' => 45, 'costPerMl' => 2.9333333333333336],
                ['item' => 'Cointreau', 'qtyMl' => 15, 'costPerMl' => 5.5],
                ['item' => 'Cranberry juice', 'qtyMl' => 30, 'costPerMl' => 0.22],
                ['item' => 'Lime juice', 'qtyMl' => 10, 'costPerMl' => 0.12],
            ]],
            ['Whisky Sour', 'Classic', 690, 25, [
                ['item' => 'Jameson', 'qtyMl' => 60, 'costPerMl' => 4.533333333333333],
                ['item' => 'Lemon juice', 'qtyMl' => 25, 'costPerMl' => 0.14],
                ['item' => 'Sugar syrup', 'qtyMl' => 15, 'costPerMl' => 0.4],
                ['item' => 'Egg white', 'qtyMl' => 15, 'costPerMl' => 0.3],
            ]],
            ['Glenfiddich Neat', 'Highball', 1100, 20, [
                ['item' => 'Glenfiddich 12', 'qtyMl' => 60, 'costPerMl' => 9.066666666666666],
            ]],
            ['Mango Lassi Mocktail', 'Mocktail', 320, 20, [
                ['item' => 'Mango pulp', 'qtyMl' => 80, 'costPerMl' => 0.25],
                ['item' => 'Yogurt', 'qtyMl' => 120, 'costPerMl' => 0.18],
                ['item' => 'Cardamom syrup', 'qtyMl' => 10, 'costPerMl' => 0.6],
            ]],
            ['Virgin Marina Breeze', 'Mocktail', 280, 18, [
                ['item' => 'Cranberry juice', 'qtyMl' => 90, 'costPerMl' => 0.22],
                ['item' => 'Pineapple juice', 'qtyMl' => 90, 'costPerMl' => 0.18],
                ['item' => 'Lime juice', 'qtyMl' => 10, 'costPerMl' => 0.12],
            ]],
        ];

        $rows = [];
        foreach ($cocktails as [$name, $category, $menuPrice, $glassCost, $recipe]) {
            $rows[] = [
                'name'       => $name,
                'category'   => $category,
                'menuPrice'  => $menuPrice,
                'glassCost'  => $glassCost,
                'recipe'     => json_encode($recipe),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::table('bar_cocktails')->insert($rows);
    }
}
