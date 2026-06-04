<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Default login for the PMS.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@hotel.com'],
            ['name' => 'Hotel Admin', 'password' => Hash::make('password123')],
        );
    }
}
