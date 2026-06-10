<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PosTableSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('pos_tables')->count() > 0) {
            return;
        }

        $rows = json_decode(<<<'JSON'
[
  {
    "code": "T1",
    "seats": 2,
    "status": "free",
    "zone": "Main Hall"
  },
  {
    "code": "T2",
    "seats": 4,
    "status": "seated",
    "server": "Rohan",
    "covers": 3,
    "seatedAt": "12:42",
    "zone": "Main Hall"
  },
  {
    "code": "T3",
    "seats": 4,
    "status": "ordering",
    "server": "Anita",
    "covers": 4,
    "seatedAt": "12:25",
    "zone": "Main Hall"
  },
  {
    "code": "T4",
    "seats": 2,
    "status": "free",
    "zone": "Main Hall"
  },
  {
    "code": "T5",
    "seats": 6,
    "status": "billing",
    "server": "Vikram",
    "covers": 5,
    "seatedAt": "11:55",
    "zone": "Main Hall"
  },
  {
    "code": "T6",
    "seats": 4,
    "status": "dirty",
    "zone": "Main Hall"
  },
  {
    "code": "T7",
    "seats": 2,
    "status": "seated",
    "server": "Rohan",
    "covers": 2,
    "seatedAt": "12:50",
    "zone": "Main Hall"
  },
  {
    "code": "T8",
    "seats": 8,
    "status": "ordering",
    "server": "Anita",
    "covers": 7,
    "seatedAt": "12:18",
    "zone": "Main Hall"
  },
  {
    "code": "T9",
    "seats": 4,
    "status": "free",
    "zone": "Garden"
  },
  {
    "code": "T10",
    "seats": 4,
    "status": "seated",
    "server": "Vikram",
    "covers": 4,
    "seatedAt": "12:35",
    "zone": "Garden"
  },
  {
    "code": "T11",
    "seats": 2,
    "status": "free",
    "zone": "Garden"
  },
  {
    "code": "T12",
    "seats": 6,
    "status": "billing",
    "server": "Priya",
    "covers": 6,
    "seatedAt": "12:02",
    "zone": "Garden"
  },
  {
    "code": "T13",
    "seats": 4,
    "status": "dirty",
    "zone": "Garden"
  },
  {
    "code": "T14",
    "seats": 2,
    "status": "seated",
    "server": "Rohan",
    "covers": 2,
    "seatedAt": "12:48",
    "zone": "Garden"
  },
  {
    "code": "T15",
    "seats": 4,
    "status": "ordering",
    "server": "Anita",
    "covers": 3,
    "seatedAt": "12:30",
    "zone": "Private"
  },
  {
    "code": "T16",
    "seats": 4,
    "status": "free",
    "zone": "Private"
  },
  {
    "code": "T17",
    "seats": 8,
    "status": "seated",
    "server": "Vikram",
    "covers": 6,
    "seatedAt": "12:40",
    "zone": "Private"
  },
  {
    "code": "T18",
    "seats": 2,
    "status": "free",
    "zone": "Private"
  },
  {
    "code": "T19",
    "seats": 4,
    "status": "free",
    "zone": "Terrace"
  },
  {
    "code": "T20",
    "seats": 6,
    "status": "ordering",
    "server": "Priya",
    "covers": 5,
    "seatedAt": "12:22",
    "zone": "Terrace"
  }
]
JSON, true);

        $arrayCols = [];
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
            DB::table('pos_tables')->insert($row);
        }
    }
}
