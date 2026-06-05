<?php

namespace Database\Seeders;

use App\Models\AccountEntry;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    public function run(): void
    {
        if (AccountEntry::count() > 0) {
            return;
        }

        foreach ([
            ['date' => '25 May', 'type' => 'income', 'category' => 'Room Revenue', 'description' => 'Folio settlement — Yuki Tanaka', 'amount' => 2335, 'mode' => 'Card', 'ref' => 'INV-100245'],
            ['date' => '25 May', 'type' => 'expense', 'category' => 'Utilities (DEWA)', 'description' => 'DEWA electricity bill', 'amount' => 4200, 'mode' => 'Bank', 'ref' => 'DEWA-04A219'],
            ['date' => '24 May', 'type' => 'income', 'category' => 'Room Revenue', 'description' => 'ABC Travels — advance receipt', 'amount' => 8000, 'mode' => 'Bank', 'ref' => 'ADV-2401'],
            ['date' => '24 May', 'type' => 'expense', 'category' => 'Linen & Amenities', 'description' => 'Linen supplier — invoice', 'amount' => 1850, 'mode' => 'Bank', 'ref' => 'L-4421'],
            ['date' => '23 May', 'type' => 'refund', 'category' => 'Room Revenue', 'description' => 'Refund — no-show waiver', 'amount' => 650, 'mode' => 'Bank', 'ref' => 'REF-001'],
            ['date' => '23 May', 'type' => 'income', 'category' => 'F&B', 'description' => 'F&B daily collection summary', 'amount' => 2845, 'mode' => 'Mixed', 'ref' => 'FB-25-MAY'],
            ['date' => '22 May', 'type' => 'expense', 'category' => 'Payroll', 'description' => 'Weekly payroll — front office', 'amount' => 8400, 'mode' => 'Bank', 'ref' => 'PAY-W21'],
            ['date' => '22 May', 'type' => 'income', 'category' => 'Hall Rental', 'description' => 'Conference room — TechCorp', 'amount' => 6500, 'mode' => 'Bank', 'ref' => 'HALL-2402'],
            ['date' => '21 May', 'type' => 'expense', 'category' => 'OTA Commissions', 'description' => 'Booking.com monthly commission', 'amount' => 7100, 'mode' => 'Bank', 'ref' => 'BDC-MAY'],
        ] as $e) {
            AccountEntry::create($e);
        }
    }
}
