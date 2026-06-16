<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Recipe / menu engineering data for the F&B costing screens � ingredient
 * cost breakdowns, allergens and nutrition per signature dish.
 */
class RecipeSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('recipes')->count() > 0) {
            return;
        }

        $now = now();

        $recipes = [
            [
                'name'        => 'Butter Chicken',
                'category'    => 'North Indian',
                'menuPrice'   => 525,
                'portions'    => 1,
                'prepMin'     => 20,
                'cookMin'     => 25,
                'labour'      => 32,
                'overhead'    => 18,
                'description' => 'Slow-simmered tandoori chicken in a velvety tomato-cashew gravy finished with cream and kasuri methi.',
                'allergens'   => ['dairy', 'nuts'],
                'nutrition'   => ['calories' => 612, 'protein' => 38, 'carbs' => 14, 'fat' => 44],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Chicken thigh (boneless)', 'qty' => 220, 'unit' => 'g', 'unitCost' => 0.32],
                    ['id' => 'i2', 'name' => 'Tomato (ripe)', 'qty' => 180, 'unit' => 'g', 'unitCost' => 0.04],
                    ['id' => 'i3', 'name' => 'Cashew paste', 'qty' => 25, 'unit' => 'g', 'unitCost' => 0.85],
                    ['id' => 'i4', 'name' => 'Fresh cream (Amul)', 'qty' => 40, 'unit' => 'ml', 'unitCost' => 0.28],
                    ['id' => 'i5', 'name' => 'Butter (Amul Lite)', 'qty' => 18, 'unit' => 'g', 'unitCost' => 0.52],
                    ['id' => 'i6', 'name' => 'Kasuri methi', 'qty' => 2, 'unit' => 'g', 'unitCost' => 1.4],
                ],
            ],
            [
                'name'        => 'Paneer Tikka',
                'category'    => 'North Indian',
                'menuPrice'   => 425,
                'portions'    => 1,
                'prepMin'     => 30,
                'cookMin'     => 12,
                'labour'      => 25,
                'overhead'    => 14,
                'description' => 'Hung-curd marinated paneer skewers chargrilled in the tandoor with bell peppers and onion.',
                'allergens'   => ['dairy'],
                'nutrition'   => ['calories' => 484, 'protein' => 24, 'carbs' => 18, 'fat' => 32],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Paneer (fresh)', 'qty' => 180, 'unit' => 'g', 'unitCost' => 0.42],
                    ['id' => 'i2', 'name' => 'Yoghurt (hung curd)', 'qty' => 60, 'unit' => 'g', 'unitCost' => 0.16],
                    ['id' => 'i3', 'name' => 'Ginger-garlic paste', 'qty' => 12, 'unit' => 'g', 'unitCost' => 0.18],
                    ['id' => 'i4', 'name' => 'Kashmiri red chilli powder', 'qty' => 4, 'unit' => 'g', 'unitCost' => 0.95],
                    ['id' => 'i5', 'name' => 'Onion', 'qty' => 50, 'unit' => 'g', 'unitCost' => 0.03],
                ],
            ],
            [
                'name'        => 'Caesar Salad',
                'category'    => 'Continental',
                'menuPrice'   => 395,
                'portions'    => 1,
                'prepMin'     => 15,
                'cookMin'     => 0,
                'labour'      => 22,
                'overhead'    => 12,
                'description' => 'Crisp romaine tossed in a classic anchovy-parmesan dressing with house-made garlic croutons.',
                'allergens'   => ['dairy', 'egg', 'fish', 'gluten'],
                'nutrition'   => ['calories' => 388, 'protein' => 14, 'carbs' => 22, 'fat' => 28],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Lettuce (Romaine)', 'qty' => 150, 'unit' => 'g', 'unitCost' => 0.38],
                    ['id' => 'i2', 'name' => 'Parmesan cheese', 'qty' => 25, 'unit' => 'g', 'unitCost' => 2.4],
                    ['id' => 'i3', 'name' => 'Anchovy fillet', 'qty' => 8, 'unit' => 'g', 'unitCost' => 1.8],
                    ['id' => 'i4', 'name' => 'Croutons (house-made)', 'qty' => 30, 'unit' => 'g', 'unitCost' => 0.22],
                    ['id' => 'i5', 'name' => 'Egg yolk', 'qty' => 1, 'unit' => 'pc', 'unitCost' => 7],
                    ['id' => 'i6', 'name' => 'Olive oil (extra virgin)', 'qty' => 20, 'unit' => 'ml', 'unitCost' => 1.6],
                ],
            ],
            [
                'name'        => 'Margherita Pizza',
                'category'    => 'Continental',
                'menuPrice'   => 475,
                'portions'    => 1,
                'prepMin'     => 10,
                'cookMin'     => 8,
                'labour'      => 28,
                'overhead'    => 22,
                'description' => 'Wood-fired 12-inch with San Marzano sauce, fior di latte mozzarella and fresh Italian basil.',
                'allergens'   => ['dairy', 'gluten'],
                'nutrition'   => ['calories' => 712, 'protein' => 28, 'carbs' => 84, 'fat' => 28],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Pizza dough (12-inch)', 'qty' => 1, 'unit' => 'pc', 'unitCost' => 28],
                    ['id' => 'i2', 'name' => 'San Marzano tomato sauce', 'qty' => 90, 'unit' => 'ml', 'unitCost' => 0.34],
                    ['id' => 'i3', 'name' => 'Mozzarella cheese', 'qty' => 120, 'unit' => 'g', 'unitCost' => 0.58],
                    ['id' => 'i4', 'name' => 'Fresh basil', 'qty' => 6, 'unit' => 'g', 'unitCost' => 1.1],
                    ['id' => 'i5', 'name' => 'Olive oil (extra virgin)', 'qty' => 10, 'unit' => 'ml', 'unitCost' => 1.6],
                ],
            ],
            [
                'name'        => 'Masala Dosa',
                'category'    => 'South Indian',
                'menuPrice'   => 285,
                'portions'    => 1,
                'prepMin'     => 5,
                'cookMin'     => 6,
                'labour'      => 18,
                'overhead'    => 10,
                'description' => 'Crisp fermented rice-lentil crepe filled with spiced potato masala, served with sambar and chutney.',
                'allergens'   => [],
                'nutrition'   => ['calories' => 458, 'protein' => 11, 'carbs' => 72, 'fat' => 14],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Dosa batter (fermented)', 'qty' => 180, 'unit' => 'ml', 'unitCost' => 0.18],
                    ['id' => 'i2', 'name' => 'Potato (boiled)', 'qty' => 120, 'unit' => 'g', 'unitCost' => 0.025],
                    ['id' => 'i3', 'name' => 'Onion', 'qty' => 40, 'unit' => 'g', 'unitCost' => 0.03],
                    ['id' => 'i4', 'name' => 'Mustard seeds', 'qty' => 2, 'unit' => 'g', 'unitCost' => 0.4],
                    ['id' => 'i5', 'name' => 'Curry leaves', 'qty' => 3, 'unit' => 'g', 'unitCost' => 0.5],
                    ['id' => 'i6', 'name' => 'Refined oil', 'qty' => 15, 'unit' => 'ml', 'unitCost' => 0.14],
                ],
            ],
            [
                'name'        => 'Hyderabadi Biryani',
                'category'    => 'Biryani',
                'menuPrice'   => 595,
                'portions'    => 1,
                'prepMin'     => 40,
                'cookMin'     => 35,
                'labour'      => 38,
                'overhead'    => 24,
                'description' => 'Dum-cooked basmati layered with marinated mutton, saffron milk, fried onions and mint.',
                'allergens'   => ['dairy'],
                'nutrition'   => ['calories' => 824, 'protein' => 36, 'carbs' => 92, 'fat' => 36],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Basmati rice (1121)', 'qty' => 200, 'unit' => 'g', 'unitCost' => 0.12],
                    ['id' => 'i2', 'name' => 'Mutton (curry cut)', 'qty' => 180, 'unit' => 'g', 'unitCost' => 0.78],
                    ['id' => 'i3', 'name' => 'Yoghurt (hung curd)', 'qty' => 50, 'unit' => 'g', 'unitCost' => 0.16],
                    ['id' => 'i4', 'name' => 'Saffron strands', 'qty' => 0.1, 'unit' => 'g', 'unitCost' => 220],
                    ['id' => 'i5', 'name' => 'Mint leaves', 'qty' => 10, 'unit' => 'g', 'unitCost' => 0.45],
                    ['id' => 'i6', 'name' => 'Onion', 'qty' => 80, 'unit' => 'g', 'unitCost' => 0.03],
                    ['id' => 'i7', 'name' => 'Garam masala', 'qty' => 3, 'unit' => 'g', 'unitCost' => 1.2],
                ],
            ],
            [
                'name'        => 'Tiramisu',
                'category'    => 'Desserts',
                'menuPrice'   => 345,
                'portions'    => 1,
                'prepMin'     => 25,
                'cookMin'     => 0,
                'labour'      => 20,
                'overhead'    => 14,
                'description' => 'Classic Italian dessert � mascarpone cream over espresso-soaked ladyfingers, dusted with cocoa.',
                'allergens'   => ['dairy', 'egg', 'gluten'],
                'nutrition'   => ['calories' => 482, 'protein' => 7, 'carbs' => 38, 'fat' => 32],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Mascarpone cheese', 'qty' => 80, 'unit' => 'g', 'unitCost' => 1.9],
                    ['id' => 'i2', 'name' => 'Ladyfinger biscuits', 'qty' => 50, 'unit' => 'g', 'unitCost' => 1.4],
                    ['id' => 'i3', 'name' => 'Espresso shot', 'qty' => 30, 'unit' => 'ml', 'unitCost' => 0.6],
                    ['id' => 'i4', 'name' => 'Cocoa powder', 'qty' => 4, 'unit' => 'g', 'unitCost' => 1.1],
                    ['id' => 'i5', 'name' => 'Castor sugar', 'qty' => 20, 'unit' => 'g', 'unitCost' => 0.06],
                    ['id' => 'i6', 'name' => 'Egg yolk', 'qty' => 1, 'unit' => 'pc', 'unitCost' => 7],
                ],
            ],
            [
                'name'        => 'Goan Prawn Curry',
                'category'    => 'Coastal',
                'menuPrice'   => 645,
                'portions'    => 1,
                'prepMin'     => 18,
                'cookMin'     => 20,
                'labour'      => 30,
                'overhead'    => 20,
                'description' => 'Plump prawns simmered in a tangy coconut-kokum gravy with curry leaves and red chillies.',
                'allergens'   => ['shellfish'],
                'nutrition'   => ['calories' => 542, 'protein' => 32, 'carbs' => 16, 'fat' => 38],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Prawns (medium)', 'qty' => 180, 'unit' => 'g', 'unitCost' => 0.95],
                    ['id' => 'i2', 'name' => 'Coconut milk', 'qty' => 120, 'unit' => 'ml', 'unitCost' => 0.22],
                    ['id' => 'i3', 'name' => 'Onion', 'qty' => 60, 'unit' => 'g', 'unitCost' => 0.03],
                    ['id' => 'i4', 'name' => 'Tomato (ripe)', 'qty' => 80, 'unit' => 'g', 'unitCost' => 0.04],
                    ['id' => 'i5', 'name' => 'Curry leaves', 'qty' => 2, 'unit' => 'g', 'unitCost' => 0.5],
                    ['id' => 'i6', 'name' => 'Kashmiri red chilli powder', 'qty' => 3, 'unit' => 'g', 'unitCost' => 0.95],
                ],
            ],
            [
                'name'        => 'Dal Makhani',
                'category'    => 'North Indian',
                'menuPrice'   => 365,
                'portions'    => 1,
                'prepMin'     => 15,
                'cookMin'     => 90,
                'labour'      => 26,
                'overhead'    => 16,
                'description' => 'Black urad and rajma slow-cooked overnight with butter, cream and aromatic spices.',
                'allergens'   => ['dairy'],
                'nutrition'   => ['calories' => 524, 'protein' => 18, 'carbs' => 42, 'fat' => 30],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Tomato (ripe)', 'qty' => 120, 'unit' => 'g', 'unitCost' => 0.04],
                    ['id' => 'i2', 'name' => 'Butter (Amul Lite)', 'qty' => 20, 'unit' => 'g', 'unitCost' => 0.52],
                    ['id' => 'i3', 'name' => 'Fresh cream (Amul)', 'qty' => 30, 'unit' => 'ml', 'unitCost' => 0.28],
                    ['id' => 'i4', 'name' => 'Ginger-garlic paste', 'qty' => 10, 'unit' => 'g', 'unitCost' => 0.18],
                    ['id' => 'i5', 'name' => 'Garam masala', 'qty' => 2, 'unit' => 'g', 'unitCost' => 1.2],
                ],
            ],
            [
                'name'        => 'Pav Bhaji',
                'category'    => 'Street Food',
                'menuPrice'   => 245,
                'portions'    => 1,
                'prepMin'     => 12,
                'cookMin'     => 18,
                'labour'      => 16,
                'overhead'    => 10,
                'description' => 'Mashed mixed-vegetable bhaji with butter-toasted pav, raw onion and lime.',
                'allergens'   => ['dairy', 'gluten'],
                'nutrition'   => ['calories' => 612, 'protein' => 14, 'carbs' => 78, 'fat' => 26],
                'ingredients' => [
                    ['id' => 'i1', 'name' => 'Potato (boiled)', 'qty' => 150, 'unit' => 'g', 'unitCost' => 0.025],
                    ['id' => 'i2', 'name' => 'Tomato (ripe)', 'qty' => 100, 'unit' => 'g', 'unitCost' => 0.04],
                    ['id' => 'i3', 'name' => 'Onion', 'qty' => 60, 'unit' => 'g', 'unitCost' => 0.03],
                    ['id' => 'i4', 'name' => 'Butter (Amul Lite)', 'qty' => 22, 'unit' => 'g', 'unitCost' => 0.52],
                    ['id' => 'i5', 'name' => 'Garam masala', 'qty' => 3, 'unit' => 'g', 'unitCost' => 1.2],
                    ['id' => 'i6', 'name' => 'Coriander leaves', 'qty' => 8, 'unit' => 'g', 'unitCost' => 0.32],
                ],
            ],
        ];

        $rows = [];
        foreach ($recipes as $r) {
            $rows[] = [
                'name'        => $r['name'],
                'category'    => $r['category'],
                'menuPrice'   => $r['menuPrice'],
                'portions'    => $r['portions'],
                'prepMin'     => $r['prepMin'],
                'cookMin'     => $r['cookMin'],
                'labour'      => $r['labour'],
                'overhead'    => $r['overhead'],
                'description' => $r['description'],
                'ingredients' => json_encode($r['ingredients']),
                'allergens'   => json_encode($r['allergens']),
                'nutrition'   => json_encode($r['nutrition']),
                'created_at'  => $now,
                'updated_at'  => $now,
            ];
        }

        DB::table('recipes')->insert($rows);
    }
}
