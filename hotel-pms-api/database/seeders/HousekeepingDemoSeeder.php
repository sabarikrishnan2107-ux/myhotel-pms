<?php

namespace Database\Seeders;

use App\Models\HousekeepingTask;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Demo data for the housekeeping mobile app: real housekeeping login users with
 * 2000-series employee codes (2001, 2002, …) plus a few rooms assigned to the
 * first employee so the app has something to show.
 *
 * Run standalone:  php artisan db:seed --class=HousekeepingDemoSeeder --force
 *
 * company_id + employee_code are set EXPLICITLY (seeders run without an auth
 * context / the StaffController auto-assign path).
 */
class HousekeepingDemoSeeder extends Seeder
{
    public function run(): void
    {
        $companyId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');

        // Housekeeping employees who can log into the mobile app (by email or code).
        $team = [
            ['name' => 'Maria Lopez',  'email' => 'maria@hotel.com',  'code' => '2001'],
            ['name' => 'Aisha Mohamed', 'email' => 'aisha@hotel.com', 'code' => '2002'],
            ['name' => 'Sunil Verma',  'email' => 'sunil@hotel.com',  'code' => '2003'],
        ];

        $employees = [];
        foreach ($team as $member) {
            $employees[] = User::firstOrCreate(
                ['email' => $member['email']],
                [
                    'name'          => $member['name'],
                    'password'      => Hash::make('123456'),
                    'role'          => 'Housekeeping',
                    'department'    => 'Housekeeping',
                    'status'        => 'active',
                    'company_id'    => $companyId,
                    'employee_code' => $member['code'],
                ]
            );
        }

        // Ensure existing rows have the code + the default password (firstOrCreate
        // won't update them). Default housekeeping login password is 123456.
        foreach ($team as $i => $member) {
            $employees[$i]->employee_code = $member['code'];
            $employees[$i]->password = Hash::make('123456');
            $employees[$i]->save();
        }

        // Assign a few real rooms to the first employee (Maria) so start/complete
        // room-board sync works and her login has tasks.
        $maria = $employees[0];
        $rooms = Room::orderBy('floor')->orderBy('number')->take(3)->get();

        if ($rooms->isEmpty()) {
            $rooms = collect([
                (object) ['id' => null, 'number' => '205', 'floor' => 2, 'category' => 'Deluxe'],
                (object) ['id' => null, 'number' => '112', 'floor' => 1, 'category' => 'Standard'],
            ]);
        }

        foreach ($rooms as $i => $room) {
            HousekeepingTask::firstOrCreate(
                ['room' => $room->number, 'assignedToUserId' => $maria->id, 'status' => 'assigned'],
                [
                    'roomId'     => $room->id,
                    'floor'      => $room->floor,
                    'roomType'   => $room->category ?? 'Standard',
                    'type'       => $i === 0 ? 'Checkout Cleaning' : 'Cleaning',
                    'priority'   => $i === 0 ? 'urgent' : 'normal',
                    'assignee'   => $maria->name,
                    'assignedBy' => 'Front Office',
                    'assignedAt' => now()->toDateTimeString(),
                    'company_id' => $companyId,
                ]
            );
        }
    }
}
