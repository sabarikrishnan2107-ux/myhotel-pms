<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MaintenanceScheduleSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('maintenance_schedules')->count() > 0) {
            return;
        }

        $rows = json_decode(<<<'JSON'
[
  {
    "equipment": "Pool chlorine check",
    "area": "Swimming Pool",
    "category": "Pool",
    "frequency": "daily",
    "lastDone": "2026-05-23",
    "nextDue": "2026-05-24",
    "assignee": "Mahmoud S.",
    "durationMin": 10
  },
  {
    "equipment": "Kitchen walk-in fridge temp",
    "area": "Main Kitchen",
    "category": "HVAC",
    "frequency": "daily",
    "lastDone": "2026-05-23",
    "nextDue": "2026-05-24",
    "assignee": "Ravi K.",
    "durationMin": 5
  },
  {
    "equipment": "Lobby AC filter inspection",
    "area": "Lobby",
    "category": "HVAC",
    "frequency": "daily",
    "lastDone": "2026-05-23",
    "nextDue": "2026-05-24",
    "assignee": "Ravi K.",
    "durationMin": 15
  },
  {
    "equipment": "Generator test run",
    "area": "Basement · DG room",
    "category": "Electrical",
    "frequency": "weekly",
    "lastDone": "2026-05-19",
    "nextDue": "2026-05-26",
    "assignee": "Joseph L.",
    "durationMin": 30
  },
  {
    "equipment": "Water tank chlorination",
    "area": "Rooftop · Tank #1",
    "category": "Plumbing",
    "frequency": "weekly",
    "lastDone": "2026-05-18",
    "nextDue": "2026-05-25",
    "assignee": "Ahmed F.",
    "durationMin": 45
  },
  {
    "equipment": "Fire-alarm panel test",
    "area": "Control Room",
    "category": "Safety",
    "frequency": "weekly",
    "lastDone": "2026-05-17",
    "nextDue": "2026-05-24",
    "assignee": "Joseph L.",
    "durationMin": 20
  },
  {
    "equipment": "Lift cabin inspection",
    "area": "Service Lift",
    "category": "Access",
    "frequency": "weekly",
    "lastDone": "2026-05-21",
    "nextDue": "2026-05-28",
    "assignee": "Mahmoud S.",
    "durationMin": 25
  },
  {
    "equipment": "Deep AC coil cleaning",
    "area": "All guest floors",
    "category": "HVAC",
    "frequency": "monthly",
    "lastDone": "2026-05-04",
    "nextDue": "2026-06-03",
    "assignee": "Ravi K.",
    "durationMin": 240
  },
  {
    "equipment": "Pest control treatment",
    "area": "Kitchens · F&B",
    "category": "Cleaning",
    "frequency": "monthly",
    "lastDone": "2026-05-09",
    "nextDue": "2026-06-08",
    "assignee": "Ahmed F.",
    "durationMin": 120
  },
  {
    "equipment": "Fire extinguisher refill check",
    "area": "All floors",
    "category": "Safety",
    "frequency": "monthly",
    "lastDone": "2026-04-29",
    "nextDue": "2026-05-29",
    "assignee": "Joseph L.",
    "durationMin": 90
  },
  {
    "equipment": "Boiler descaling",
    "area": "Hot water plant",
    "category": "Plumbing",
    "frequency": "monthly",
    "lastDone": "2026-04-26",
    "nextDue": "2026-05-26",
    "assignee": "Ahmed F.",
    "durationMin": 180
  },
  {
    "equipment": "Lift annual inspection",
    "area": "All elevators",
    "category": "Access",
    "frequency": "quarterly",
    "lastDone": "2026-03-25",
    "nextDue": "2026-06-23",
    "assignee": "AMC · ElevPro",
    "durationMin": 480
  },
  {
    "equipment": "Pool tile + grout repair",
    "area": "Swimming Pool",
    "category": "Pool",
    "frequency": "quarterly",
    "lastDone": "2026-03-10",
    "nextDue": "2026-06-08",
    "assignee": "Mahmoud S.",
    "durationMin": 360
  },
  {
    "equipment": "Building exterior inspection",
    "area": "Facade",
    "category": "Civil",
    "frequency": "quarterly",
    "lastDone": "2026-03-05",
    "nextDue": "2026-06-03",
    "assignee": "AMC · BuildSafe",
    "durationMin": 240
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
            DB::table('maintenance_schedules')->insert($row);
        }
    }
}
