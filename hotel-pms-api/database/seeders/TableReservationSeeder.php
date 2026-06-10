<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TableReservationSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::table('table_reservations')->count() > 0) {
            return;
        }

        $rows = json_decode(<<<'JSON'
[
  {
    "table": "T3",
    "startHr": 12.5,
    "durHr": 1.5,
    "guest": "Rohan Malhotra",
    "party": 2,
    "phone": "+91 98201 22341",
    "notes": "Window seat",
    "occasion": "date-night",
    "status": "completed",
    "source": "Direct"
  },
  {
    "table": "T7",
    "startHr": 13,
    "durHr": 2,
    "guest": "Sneha Iyer",
    "party": 4,
    "phone": "+91 99303 11220",
    "notes": "High-chair needed",
    "occasion": "family",
    "status": "completed",
    "source": "Phone"
  },
  {
    "table": "T11",
    "startHr": 13.5,
    "durHr": 1.5,
    "guest": "Vikram Reddy",
    "party": 3,
    "phone": "+91 98402 78812",
    "occasion": "business",
    "status": "completed",
    "source": "Direct"
  },
  {
    "table": "T1",
    "startHr": 19,
    "durHr": 2,
    "guest": "Anjali Iyer",
    "party": 2,
    "phone": "+91 98112 45662",
    "notes": "Anniversary cake at 20:30",
    "occasion": "anniversary",
    "status": "seated",
    "source": "Phone"
  },
  {
    "table": "T5",
    "startHr": 19.5,
    "durHr": 2,
    "guest": "Karan Mehta",
    "party": 2,
    "phone": "+91 98765 12010",
    "notes": "Allergic to peanuts",
    "occasion": "date-night",
    "status": "seated",
    "source": "Zomato"
  },
  {
    "table": "T8",
    "startHr": 19,
    "durHr": 2.5,
    "guest": "Priya Krishnan",
    "party": 4,
    "phone": "+91 99887 66541",
    "notes": "Jain food only",
    "occasion": "family",
    "status": "seated",
    "source": "Dineout"
  },
  {
    "table": "T9",
    "startHr": 19.5,
    "durHr": 2,
    "guest": "Arjun Kapoor",
    "party": 4,
    "phone": "+91 98201 90011",
    "occasion": "none",
    "status": "confirmed",
    "source": "Direct"
  },
  {
    "table": "T10",
    "startHr": 20,
    "durHr": 2,
    "guest": "Meera Nair",
    "party": 4,
    "phone": "+91 90004 88210",
    "notes": "Birthday — surprise cake",
    "occasion": "birthday",
    "status": "confirmed",
    "source": "Phone"
  },
  {
    "table": "T12",
    "startHr": 20,
    "durHr": 2.5,
    "guest": "Rajesh Pillai",
    "party": 6,
    "phone": "+91 98863 55421",
    "notes": "Bring high chair x1",
    "occasion": "family",
    "status": "confirmed",
    "source": "Zomato"
  },
  {
    "table": "T13",
    "startHr": 20.5,
    "durHr": 2,
    "guest": "Neha Gupta",
    "party": 4,
    "phone": "+91 99004 22118",
    "occasion": "none",
    "status": "confirmed",
    "source": "Dineout"
  },
  {
    "table": "T15",
    "startHr": 19.5,
    "durHr": 3,
    "guest": "Aditya Shenoy",
    "party": 6,
    "phone": "+91 98201 78821",
    "notes": "Wine pairing menu",
    "occasion": "anniversary",
    "status": "seated",
    "source": "Direct"
  },
  {
    "table": "T16",
    "startHr": 20.5,
    "durHr": 2.5,
    "guest": "Tanvi Bhatt",
    "party": 6,
    "phone": "+91 98920 67711",
    "notes": "Vegan menu",
    "occasion": "business",
    "status": "confirmed",
    "source": "Phone"
  },
  {
    "table": "T17",
    "startHr": 21,
    "durHr": 2,
    "guest": "Saurabh Joshi",
    "party": 6,
    "phone": "+91 98112 09988",
    "occasion": "none",
    "status": "confirmed",
    "source": "Zomato"
  },
  {
    "table": "T19",
    "startHr": 20,
    "durHr": 2.5,
    "guest": "Kapoor Family",
    "party": 8,
    "phone": "+91 98201 33445",
    "notes": "70th birthday — main cake at 21:00",
    "occasion": "birthday",
    "status": "confirmed",
    "source": "Direct"
  },
  {
    "table": "T20",
    "startHr": 21,
    "durHr": 2,
    "guest": "Shah Family",
    "party": 8,
    "phone": "+91 99001 78812",
    "notes": "Gujarati thali pre-order",
    "occasion": "family",
    "status": "confirmed",
    "source": "Phone"
  },
  {
    "table": "T2",
    "startHr": 20,
    "durHr": 1.5,
    "guest": "Ritu Sharma",
    "party": 2,
    "phone": "+91 99877 21134",
    "notes": "Quick dinner",
    "occasion": "none",
    "status": "confirmed",
    "source": "Walk-in"
  },
  {
    "table": "T6",
    "startHr": 20.5,
    "durHr": 2,
    "guest": "Devansh Rao",
    "party": 2,
    "phone": "+91 98980 71122",
    "notes": "Pre-paid via Dineout",
    "occasion": "date-night",
    "status": "confirmed",
    "source": "Dineout"
  },
  {
    "table": "T14",
    "startHr": 21.5,
    "durHr": 1.5,
    "guest": "Farah Khan",
    "party": 4,
    "phone": "+91 98201 11102",
    "occasion": "none",
    "status": "confirmed",
    "source": "Phone"
  },
  {
    "table": "T4",
    "startHr": 19.5,
    "durHr": 1.5,
    "guest": "Mahesh Pawar",
    "party": 2,
    "phone": "+91 98321 44556",
    "notes": "Did not arrive",
    "occasion": "none",
    "status": "no-show",
    "source": "Zomato"
  },
  {
    "table": "T18",
    "startHr": 20,
    "durHr": 2,
    "guest": "Khanna Reunion",
    "party": 6,
    "phone": "+91 98201 67788",
    "notes": "Cancelled at 17:40 — wedding clash",
    "occasion": "family",
    "status": "cancelled",
    "source": "Direct"
  },
  {
    "table": "T18",
    "startHr": 14,
    "durHr": 4,
    "guest": "Maintenance — booth re-upholstery",
    "party": 0,
    "phone": "—",
    "occasion": "none",
    "status": "blocked",
    "notes": "Welspun fabric refit"
  },
  {
    "table": "T20",
    "startHr": 12,
    "durHr": 4,
    "guest": "Private — Corporate lunch (Reliance)",
    "party": 8,
    "phone": "+91 98201 90099",
    "occasion": "business",
    "status": "blocked",
    "notes": "Pre-set thali · billed to corporate"
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
            DB::table('table_reservations')->insert($row);
        }
    }
}
