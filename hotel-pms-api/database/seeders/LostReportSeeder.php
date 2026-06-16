<?php

namespace Database\Seeders;

use App\Models\LostReport;
use Illuminate\Database\Seeder;

class LostReportSeeder extends Seeder
{
    public function run(): void
    {
        if (LostReport::count() > 0) {
            return;
        }

        foreach ([
            [
                'reportNo' => 'LR/2026/0091', 'guest' => 'Mr. Rohit Sharma', 'phone' => '+91 98201 22334',
                'email' => 'rohit.sharma@example.com', 'isWalkIn' => false, 'room' => '508',
                'stayFrom' => '28 May', 'stayTo' => '01 Jun', 'itemCategory' => 'Jewellery', 'itemName' => 'Wedding ring',
                'brand' => 'Tanishq', 'color' => 'Gold',
                'description' => "22kt gold wedding ring with diamond cluster, engraved 'R&P 2018' inside band.",
                'identification' => "Engraving 'R&P 2018' inside the band", 'hasPhoto' => true,
                'lostDate' => '2026-06-01', 'lostTime' => '08:45', 'lastSeen' => 'Room 508 - Bathroom counter',
                'reportedOn' => '2026-06-01 10:12', 'urgency' => 'Urgent', 'status' => 'Searching', 'contactMode' => 'WhatsApp',
                'remarks' => 'Guest very distressed - sentimental value.', 'estValue' => 185000, 'hvi' => true,
                'timeline' => [], 'matches' => [],
            ],
            [
                'reportNo' => 'LR/2026/0090', 'guest' => 'Ms. Anjali Iyer', 'phone' => '+91 99102 88774',
                'email' => 'anjali.iyer@example.com', 'isWalkIn' => false, 'room' => '302',
                'stayFrom' => '30 May', 'stayTo' => '02 Jun', 'itemCategory' => 'Electronics', 'itemName' => 'iPhone 15 Pro',
                'brand' => 'Apple', 'color' => 'Natural Titanium',
                'description' => 'iPhone 15 Pro 256GB, brown leather case, family photo wallpaper.',
                'identification' => 'IMEI: 35XXXXXXXXXX9821 (on file)', 'hasPhoto' => true,
                'lostDate' => '2026-05-31', 'lostTime' => '21:30', 'lastSeen' => 'Marina Restaurant - Table 14',
                'reportedOn' => '2026-05-31 22:05', 'urgency' => 'High', 'status' => 'Possible match', 'contactMode' => 'WhatsApp',
                'remarks' => 'Phone was on the table during dessert.', 'estValue' => 145000, 'hvi' => true,
                'timeline' => [], 'matches' => [],
            ],
            [
                'reportNo' => 'LR/2026/0089', 'guest' => 'Mr. Karan Mehta', 'phone' => '+91 98765 43210',
                'email' => 'karan.mehta@example.com', 'isWalkIn' => true, 'itemCategory' => 'Bag/Luggage',
                'itemName' => 'Black backpack', 'brand' => 'Wildcraft', 'color' => 'Black',
                'description' => 'Black laptop backpack with charger and notebook inside.',
                'hasPhoto' => false, 'lostDate' => '2026-05-30', 'lostTime' => '17:00', 'lastSeen' => 'Lobby - Reception area',
                'reportedOn' => '2026-05-30 18:20', 'urgency' => 'Medium', 'status' => 'Reported', 'contactMode' => 'Phone call',
                'estValue' => 6500, 'hvi' => false, 'timeline' => [], 'matches' => [],
            ],
        ] as $r) {
            LostReport::create($r);
        }
    }
}
