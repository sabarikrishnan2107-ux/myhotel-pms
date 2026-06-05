<?php

namespace Database\Seeders;

use App\Models\AppUser;
use Illuminate\Database\Seeder;

class AppUserRosterSeeder extends Seeder
{
    public function run(): void
    {
        if (AppUser::count() > 0) {
            return;
        }

        foreach ([
            ['name' => 'Khalid Rahman', 'email' => 'khalid@pearlmarina.com', 'role' => 'Reception', 'status' => 'active', 'last' => 'Just now', 'twoFA' => true, 'joinedAt' => '12 Mar 2024'],
            ['name' => 'Tom Walker', 'email' => 'tom@pearlmarina.com', 'role' => 'Manager', 'status' => 'active', 'last' => '12 min ago', 'twoFA' => true, 'joinedAt' => '18 Jun 2024'],
            ['name' => 'Fatima Al-Hashimi', 'email' => 'fatima@pearlmarina.com', 'role' => 'Accounts', 'status' => 'active', 'last' => '1 hr ago', 'twoFA' => true, 'joinedAt' => '5 Aug 2024'],
            ['name' => 'Sunil Verma', 'email' => 'sunil@pearlmarina.com', 'role' => 'Housekeeping', 'status' => 'active', 'last' => '2 hr ago', 'twoFA' => false, 'joinedAt' => '22 Jan 2025'],
            ['name' => "Joseph D'Souza", 'email' => 'joseph@pearlmarina.com', 'role' => 'Restaurant', 'status' => 'active', 'last' => 'Yesterday', 'twoFA' => false, 'joinedAt' => '10 Apr 2025'],
            ['name' => 'Aisha Mohamed', 'email' => 'aisha@pearlmarina.com', 'role' => 'Housekeeping', 'status' => 'active', 'last' => '2 days ago', 'twoFA' => false, 'joinedAt' => '3 Feb 2025'],
            ['name' => 'Owner', 'email' => 'owner@pearlmarina.com', 'role' => 'Owner', 'status' => 'active', 'last' => 'Last week', 'twoFA' => true, 'joinedAt' => '1 Jan 2020'],
            ['name' => 'Demo Cashier', 'email' => 'demo@pearlmarina.com', 'role' => 'Reception', 'status' => 'disabled', 'last' => '3 weeks ago', 'twoFA' => false, 'joinedAt' => '9 Sep 2024'],
        ] as $u) {
            AppUser::create($u);
        }
    }
}
