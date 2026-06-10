<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BanquetOrderSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('banquet_orders')->count() > 0) {
            return;
        }

        $rows = json_decode(<<<'JSON'
[
  {
    "beoNo": "BEO-1042",
    "eventName": "Mehta-Sharma Wedding",
    "type": "Wedding",
    "date": "2026-06-15",
    "venue": "Grand Ballroom",
    "host": "Rajesh Mehta",
    "pax": 250,
    "pkg": "Platinum",
    "revenue": 850000,
    "margin": 0.34,
    "advance": 425000,
    "status": "confirmed"
  },
  {
    "beoNo": "BEO-1043",
    "eventName": "Iyer Reception",
    "type": "Wedding",
    "date": "2026-06-08",
    "venue": "Marina Lawn",
    "host": "Anjali Iyer",
    "pax": 180,
    "pkg": "Gold",
    "revenue": 480000,
    "margin": 0.31,
    "advance": 240000,
    "status": "in-progress"
  },
  {
    "beoNo": "BEO-1044",
    "eventName": "Tata Steel Annual Conference",
    "type": "Conference",
    "date": "2026-06-12",
    "venue": "Pearl Hall A+B",
    "host": "Karan Mehta",
    "pax": 120,
    "pkg": "Gold",
    "revenue": 340000,
    "margin": 0.38,
    "advance": 170000,
    "status": "confirmed"
  },
  {
    "beoNo": "BEO-1045",
    "eventName": "Priya Krishnan 40th Birthday",
    "type": "Birthday",
    "date": "2026-06-20",
    "venue": "Skydeck Terrace",
    "host": "Priya Krishnan",
    "pax": 60,
    "pkg": "Silver",
    "revenue": 145000,
    "margin": 0.42,
    "advance": 50000,
    "status": "draft"
  },
  {
    "beoNo": "BEO-1046",
    "eventName": "Sundaram-Reddy Sangeet",
    "type": "Wedding",
    "date": "2026-06-14",
    "venue": "Marina Lawn",
    "host": "Lakshmi Sundaram",
    "pax": 220,
    "pkg": "Platinum",
    "revenue": 720000,
    "margin": 0.33,
    "advance": 360000,
    "status": "confirmed"
  },
  {
    "beoNo": "BEO-1047",
    "eventName": "Reliance Capital Quarterly Meet",
    "type": "Corporate Offsite",
    "date": "2026-06-05",
    "venue": "Pearl Hall A",
    "host": "Vikram Patel",
    "pax": 85,
    "pkg": "Gold",
    "revenue": 285000,
    "margin": 0.4,
    "advance": 285000,
    "status": "completed"
  },
  {
    "beoNo": "BEO-1048",
    "eventName": "Joshi Anniversary",
    "type": "Anniversary",
    "date": "2026-06-22",
    "venue": "Garden Pavilion",
    "host": "Suresh Joshi",
    "pax": 75,
    "pkg": "Gold",
    "revenue": 215000,
    "margin": 0.36,
    "advance": 0,
    "status": "draft"
  },
  {
    "beoNo": "BEO-1049",
    "eventName": "Bajaj Finserv Townhall",
    "type": "Conference",
    "date": "2026-06-10",
    "venue": "Pearl Hall B",
    "host": "Neha Bajaj",
    "pax": 200,
    "pkg": "Platinum",
    "revenue": 540000,
    "margin": 0.35,
    "advance": 270000,
    "status": "in-progress"
  },
  {
    "beoNo": "BEO-1050",
    "eventName": "Khanna Engagement Cocktail",
    "type": "Cocktail",
    "date": "2026-06-18",
    "venue": "Skydeck Terrace",
    "host": "Aditya Khanna",
    "pax": 90,
    "pkg": "Platinum",
    "revenue": 295000,
    "margin": 0.37,
    "advance": 100000,
    "status": "confirmed"
  }
]
JSON, true);

        $arrayCols = ['timeline','courses','bars','avEquipment','decorVendors','staffing','vendors'];
        $now = now();
        // Insert row-by-row so rows with differing optional keys each get the
        // table's column defaults (a bulk insert requires uniform columns).
        foreach ($rows as $row) {
            foreach ($arrayCols as $c) {
                if (array_key_exists($c, $row)) {
                    $row[$c] = json_encode($row[$c]);
                }
            }
            $row['created_at'] = $now;
            $row['updated_at'] = $now;
            DB::table('banquet_orders')->insert($row);
        }
    }
}
