<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OtaBookingSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('ota_bookings')->count() > 0) {
            return;
        }

        $rows = [
            ['channel' => 'Booking.com', 'booking' => 'BDC-44218', 'guest' => 'Hans M�ller',  'room' => '302',     'checkIn' => '26 May', 'nights' => 3, 'status' => 'confirmed', 'total' => 2400],
            ['channel' => 'Agoda',       'booking' => 'AGD-87124', 'guest' => 'Lin Cheng',    'room' => '104',     'checkIn' => '27 May', 'nights' => 2, 'status' => 'confirmed', 'total' => 1700],
            ['channel' => 'Expedia',     'booking' => 'EXP-99841', 'guest' => 'Priya Reddy',  'room' => 'Pending', 'checkIn' => '28 May', 'nights' => 4, 'status' => 'pending',   'total' => 3400],
            ['channel' => 'Booking.com', 'booking' => 'BDC-44219', 'guest' => 'James OBrien', 'room' => '405',     'checkIn' => '25 May', 'nights' => 1, 'status' => 'modified',  'total' => 1200],
            ['channel' => 'MakeMyTrip',  'booking' => 'MMT-31202', 'guest' => 'Arjun Patel',  'room' => '208',     'checkIn' => '29 May', 'nights' => 5, 'status' => 'confirmed', 'total' => 3850],
        ];

        foreach ($rows as &$row) {
            $row['created_at'] = now();
            $row['updated_at'] = now();
        }
        unset($row);

        DB::table('ota_bookings')->insert($rows);
    }
}
