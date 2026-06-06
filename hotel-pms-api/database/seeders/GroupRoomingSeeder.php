<?php

namespace Database\Seeders;

use App\Models\GroupRooming;
use Illuminate\Database\Seeder;

class GroupRoomingSeeder extends Seeder
{
    public function run(): void
    {
        if (GroupRooming::count() > 0) {
            return;
        }

        // Rooming list for the Al-Mansoori Wedding (GRP-2401).
        foreach ([
            ['roomNo' => '601', 'roomType' => 'Suite', 'lead' => 'Mr. Hassan Al-Mansoori (Groom)', 'pax' => 1, 'phone' => '+971 50 111 2233', 'remarks' => 'VIP — late checkout 4pm'],
            ['roomNo' => '602', 'roomType' => 'Suite', 'lead' => 'Mr. Faisal Al-Mansoori (Father)', 'pax' => 2, 'remarks' => 'Adjoining preferred'],
            ['roomNo' => '603', 'roomType' => 'Suite', 'lead' => 'Mrs. Layla Khouri (Mother of bride)', 'pax' => 2],
            ['roomNo' => '501', 'roomType' => 'King', 'lead' => 'Mr. Karim Bishara', 'pax' => 2],
            ['roomNo' => '502', 'roomType' => 'King', 'lead' => 'Dr. Salim Ghazi', 'pax' => 2],
            ['roomNo' => '503', 'roomType' => 'King', 'lead' => 'Mrs. Reem Saleh', 'pax' => 1],
            ['roomNo' => null, 'roomType' => 'Deluxe', 'lead' => 'Pending — group member 7', 'pax' => 2],
            ['roomNo' => null, 'roomType' => 'Deluxe', 'lead' => 'Pending — group member 8', 'pax' => 2],
            ['roomNo' => null, 'roomType' => 'Deluxe', 'lead' => 'Pending — group member 9', 'pax' => 2],
        ] as $r) {
            GroupRooming::create(array_merge(['groupCode' => 'GRP-2401'], $r));
        }
    }
}
