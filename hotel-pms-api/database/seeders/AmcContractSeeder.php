<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AmcContractSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('amc_contracts')->count() > 0) {
            return;
        }

        $rows = json_decode(<<<'JSON'
[
  {
    "name": "ElevPro Engineering",
    "category": "Elevator / Lift",
    "contactPerson": "Suresh Kapoor",
    "phone": "+91 98765 12345",
    "email": "service@elevpro.in",
    "address": "Andheri East, Mumbai",
    "contractStart": "2025-08-01",
    "contractEnd": "2026-07-31",
    "annualFee": 144000,
    "visitFrequency": "monthly",
    "lastVisit": "2026-05-02",
    "nextVisit": "2026-06-01",
    "slaResponseHours": 4,
    "status": "renewal-due"
  },
  {
    "name": "CoolBreeze HVAC Pvt",
    "category": "HVAC / Cooling",
    "contactPerson": "Ananya Iyer",
    "phone": "+91 91234 56780",
    "email": "amc@coolbreeze.in",
    "address": "Powai, Mumbai",
    "contractStart": "2026-01-01",
    "contractEnd": "2026-12-31",
    "annualFee": 240000,
    "visitFrequency": "monthly",
    "lastVisit": "2026-05-12",
    "nextVisit": "2026-06-11",
    "slaResponseHours": 6,
    "status": "active"
  },
  {
    "name": "AquaPure Pool Services",
    "category": "Pool / Spa",
    "contactPerson": "Rahul Sharma",
    "phone": "+91 99887 65432",
    "email": "rahul@aquapure.in",
    "address": "Bandra West, Mumbai",
    "contractStart": "2025-04-01",
    "contractEnd": "2026-03-31",
    "annualFee": 96000,
    "visitFrequency": "weekly",
    "lastVisit": "2026-05-21",
    "nextVisit": "2026-05-28",
    "slaResponseHours": 12,
    "status": "expired"
  },
  {
    "name": "PestGuard India",
    "category": "Pest Control",
    "contactPerson": "Vikram Singh",
    "phone": "+91 95432 10987",
    "email": "ops@pestguard.in",
    "address": "Vile Parle, Mumbai",
    "contractStart": "2026-02-01",
    "contractEnd": "2027-01-31",
    "annualFee": 60000,
    "visitFrequency": "monthly",
    "lastVisit": "2026-05-09",
    "nextVisit": "2026-06-08",
    "slaResponseHours": 24,
    "status": "active"
  },
  {
    "name": "SafeNet Fire Systems",
    "category": "Fire Safety",
    "contactPerson": "Priya Mehta",
    "phone": "+91 96543 21098",
    "email": "service@safenet.in",
    "address": "Worli, Mumbai",
    "contractStart": "2025-12-01",
    "contractEnd": "2026-11-30",
    "annualFee": 180000,
    "visitFrequency": "quarterly",
    "lastVisit": "2026-04-09",
    "nextVisit": "2026-07-08",
    "slaResponseHours": 2,
    "status": "active"
  },
  {
    "name": "BuildSafe Civil",
    "category": "Civil / Structural",
    "contactPerson": "Dilip Joshi",
    "phone": "+91 94321 09876",
    "email": "amc@buildsafe.in",
    "address": "Lower Parel, Mumbai",
    "contractStart": "2025-09-01",
    "contractEnd": "2026-08-31",
    "annualFee": 360000,
    "visitFrequency": "quarterly",
    "lastVisit": "2026-03-05",
    "nextVisit": "2026-06-03",
    "slaResponseHours": 24,
    "status": "active"
  },
  {
    "name": "Westside Generators",
    "category": "Generator / DG",
    "contactPerson": "Karan Rao",
    "phone": "+91 93210 98765",
    "email": "service@westgen.in",
    "address": "Goregaon West, Mumbai",
    "contractStart": "2026-03-01",
    "contractEnd": "2027-02-28",
    "annualFee": 84000,
    "visitFrequency": "quarterly",
    "lastVisit": "2026-04-04",
    "nextVisit": "2026-07-03",
    "slaResponseHours": 6,
    "status": "active"
  },
  {
    "name": "GlassClean Pro",
    "category": "Facade / Window Cleaning",
    "contactPerson": "Ravi Patel",
    "phone": "+91 92109 87654",
    "email": "ops@glassclean.in",
    "address": "Malad West, Mumbai",
    "contractStart": "2026-04-01",
    "contractEnd": "2027-03-31",
    "annualFee": 120000,
    "visitFrequency": "monthly",
    "lastVisit": "2026-05-06",
    "nextVisit": "2026-06-05",
    "slaResponseHours": 48,
    "status": "active"
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
            DB::table('amc_contracts')->insert($row);
        }
    }
}
