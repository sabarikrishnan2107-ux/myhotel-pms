<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TableWaitlistEntrySeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('table_waitlist_entries')->count() > 0) {
            return;
        }

        $rows = json_decode(<<<'JSON'
[
  {
    "guest": "Suresh Pandey",
    "party": 2,
    "phone": "+91 98201 09988",
    "waitMin": 8,
    "arrivedAt": "20:08"
  },
  {
    "guest": "Aarti Deshmukh",
    "party": 4,
    "phone": "+91 99887 56712",
    "waitMin": 18,
    "arrivedAt": "20:14"
  },
  {
    "guest": "Verma Group",
    "party": 6,
    "phone": "+91 98865 33221",
    "waitMin": 35,
    "arrivedAt": "20:22",
    "notified": true
  },
  {
    "guest": "Diya Patel",
    "party": 2,
    "phone": "+91 90043 88220",
    "waitMin": 12,
    "arrivedAt": "20:28"
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
            DB::table('table_waitlist_entries')->insert($row);
        }
    }
}
