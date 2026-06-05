<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Default login for the PMS.
     *
     * Uses firstOrCreate so re-seeding NEVER overwrites a password the user
     * has since changed — the default password is only set on first creation.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@hotel.com'],
            ['name' => 'Hotel Admin', 'password' => Hash::make('password123')],
        );
    }
}
