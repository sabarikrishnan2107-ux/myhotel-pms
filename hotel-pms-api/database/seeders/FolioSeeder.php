<?php

namespace Database\Seeders;

use App\Models\FolioCharge;
use App\Models\FolioPayment;
use Illuminate\Database\Seeder;

class FolioSeeder extends Seeder
{
    public function run(): void
    {
        $no = 'BK100245'; // Rajesh Kumar's stay

        if (FolioCharge::count() === 0) {
            foreach ([
                ['date' => '2026-06-04', 'description' => 'Room — Suite (Night 1) · SAC 9963', 'type' => 'Room', 'qty' => 1, 'rate' => 18000, 'tax' => 0, 'amount' => 18000, 'paidBy' => 'Guest'],
                ['date' => '2026-06-04', 'description' => 'Breakfast Buffet × 2 · SAC 9963', 'type' => 'F&B', 'qty' => 2, 'rate' => 450, 'tax' => 45, 'amount' => 945, 'paidBy' => 'Guest'],
                ['date' => '2026-06-05', 'description' => 'Room — Suite (Night 2) · SAC 9963', 'type' => 'Room', 'qty' => 1, 'rate' => 18000, 'tax' => 0, 'amount' => 18000, 'paidBy' => 'Guest'],
                ['date' => '2026-06-05', 'description' => 'Spa — Couples Massage · SAC 9972', 'type' => 'Service', 'qty' => 1, 'rate' => 4500, 'tax' => 810, 'amount' => 5310, 'paidBy' => 'Guest'],
                ['date' => '2026-06-06', 'description' => 'Room — Suite (Night 3) · SAC 9963', 'type' => 'Room', 'qty' => 1, 'rate' => 18000, 'tax' => 0, 'amount' => 18000, 'paidBy' => 'Guest'],
                ['date' => '2026-06-06', 'description' => 'Loyalty member 10% on F&B', 'type' => 'Discount', 'qty' => 1, 'rate' => -95, 'tax' => 0, 'amount' => -95, 'paidBy' => 'Guest'],
            ] as $c) {
                FolioCharge::create($c + ['bookingNo' => $no]);
            }
        }

        if (FolioPayment::count() === 0) {
            foreach ([
                ['date' => '2026-06-04', 'mode' => 'UPI', 'reference' => 'GPay · txn 240604AB142', 'amount' => 16200],
            ] as $p) {
                FolioPayment::create($p + ['bookingNo' => $no]);
            }
        }
    }
}
