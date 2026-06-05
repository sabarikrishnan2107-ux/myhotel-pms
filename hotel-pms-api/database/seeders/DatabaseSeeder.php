<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            PropertySettingSeeder::class,
            SetupDataSeeder::class,
            GuestBookingSeeder::class,
            FolioSeeder::class,
            ErpSeeder::class,
            FbMenuSeeder::class,
            OpsSeeder::class,
            LoyaltySeeder::class,
            AccountSeeder::class,
            AppUserRosterSeeder::class,
            HallBookingSeeder::class,
            GroupBookingSeeder::class,
        ]);
    }
}
