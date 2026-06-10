<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Live F&B / kitchen orders for the Restaurant POS, Food & Room Service and
 * Kitchen Display screens. created_at is back-dated per order so the KDS
 * elapsed timers and SLA states (warning / overdue) reflect real ages.
 */
class FbOrderSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('fb_orders')->count() > 0) {
            return;
        }

        $orders = [
            // [orderNo, table, server, items, total, status, minutesAgo, room]
            ['BK-1042', 'T-07', 'Ravi K.',   [['name' => 'Butter Chicken', 'qty' => 2, 'price' => 420], ['name' => 'Garlic Naan', 'qty' => 4, 'price' => 80], ['name' => 'Jeera Rice', 'qty' => 1, 'price' => 220]], 1460, 'placed',    2,  null],
            ['BK-1043', 'T-12', 'Anjali I.', [['name' => 'Penne Arrabbiata', 'qty' => 1, 'price' => 480], ['name' => 'Margherita Pizza', 'qty' => 1, 'price' => 520]], 1000, 'placed',    1,  null],
            ['BK-1044', 'T-03', 'Karan M.',  [['name' => 'Caesar Salad', 'qty' => 2, 'price' => 360], ['name' => 'Bruschetta', 'qty' => 1, 'price' => 280]], 1000, 'placed',    4,  null],
            ['BK-1039', 'T-15', 'Ravi K.',   [['name' => 'Tandoori Chicken', 'qty' => 1, 'price' => 560], ['name' => 'Paneer Tikka', 'qty' => 1, 'price' => 420], ['name' => 'Roomali Roti', 'qty' => 3, 'price' => 60]], 1160, 'preparing', 8,  null],
            ['BK-1040', 'T-09', 'Anjali I.', [['name' => 'Dal Makhani', 'qty' => 2, 'price' => 360], ['name' => 'Veg Biryani', 'qty' => 1, 'price' => 480], ['name' => 'Butter Naan', 'qty' => 4, 'price' => 90]], 1560, 'preparing', 7,  null],
            ['BK-1041', 'T-21', 'Karan M.',  [['name' => 'Grilled Salmon', 'qty' => 1, 'price' => 920], ['name' => 'Risotto Funghi', 'qty' => 1, 'price' => 640]], 1560, 'preparing', 18, null],
            ['BK-1037', 'Bar-5','Anjali I.', [['name' => 'Negroni', 'qty' => 1, 'price' => 650], ['name' => 'Espresso Martini', 'qty' => 2, 'price' => 620]], 1890, 'preparing', 16, null],
            ['BK-1035', 'T-06', 'Ravi K.',   [['name' => 'Chicken Tikka', 'qty' => 1, 'price' => 540], ['name' => 'Hara Bhara Kebab', 'qty' => 1, 'price' => 360]], 900,  'ready',     14, null],
            ['BK-1036', 'T-11', 'Karan M.',  [['name' => 'Lasagna Bolognese', 'qty' => 1, 'price' => 560], ['name' => 'Garlic Bread', 'qty' => 1, 'price' => 220]], 780,  'ready',     11, null],
            ['BK-1031', 'T-08', 'Anjali I.', [['name' => 'Mushroom Soup', 'qty' => 2, 'price' => 240]], 480, 'served', 25, '305'],
            ['BK-1032', 'T-14', 'Ravi K.',   [['name' => 'Seekh Kebab', 'qty' => 2, 'price' => 360]], 720, 'served', 30, null],
            ['BK-1028', 'T-02', 'Priya K.',  [['name' => 'Old Fashioned', 'qty' => 2, 'price' => 650]], 1300, 'paid', 55, null],
        ];

        $rows = [];
        foreach ($orders as [$no, $table, $server, $items, $total, $status, $minsAgo, $room]) {
            $ts = now()->subMinutes($minsAgo);
            $rows[] = [
                'orderNo'       => $no,
                'tableNo'       => $table,
                'server'        => $server,
                'items'         => json_encode($items),
                'total'         => $total,
                'status'        => $status,
                'paymentMethod' => $status === 'paid' ? 'Card' : null,
                'room'          => $room,
                'created_at'    => $ts,
                'updated_at'    => $ts,
            ];
        }

        DB::table('fb_orders')->insert($rows);
    }
}
