<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Seed 3 maintenance technicians (mobile-app logins) into the demo admin's
 * company, and hand a few existing demo tickets to the first technician so the
 * app shows real data on first login. Everything here is idempotent + guarded so
 * it is safe on the live DB and a no-op on a fresh (test) DB with no company yet.
 *
 * Technician logins: employee_code 3001/3002/3003, password "123456".
 */
return new class extends Migration
{
    public function up(): void
    {
        // Data-seeding only for real environments — never pollute the test DB
        // (tests build their own fixtures). Schema migrations still run in tests.
        if (app()->runningUnitTests()) {
            return;
        }

        // Resolve the company to seed into: the demo admin's company, else the
        // first master company. If neither exists (fresh/test DB) → skip.
        $cid = User::query()->where('email', 'admin@hotel.com')->value('company_id');
        if (! $cid) {
            $cid = DB::table('master_companies')->min('id');
        }
        if (! $cid) {
            return; // nothing to seed against yet
        }

        $techs = [
            ['code' => '3001', 'name' => 'Ravi Kumar',    'email' => 'ravi.k@hotel.com'],
            ['code' => '3002', 'name' => 'Mahmoud Salah', 'email' => 'mahmoud.s@hotel.com'],
            ['code' => '3003', 'name' => 'Joseph Lee',    'email' => 'joseph.l@hotel.com'],
        ];

        $firstTechId = null;
        foreach ($techs as $t) {
            $user = User::updateOrCreate(
                ['employee_code' => $t['code']],
                [
                    'name'       => $t['name'],
                    'email'      => $t['email'],
                    'password'   => Hash::make('123456'),
                    'role'       => 'maintenance',
                    'department' => 'Maintenance',
                    'status'     => 'active',
                    'company_id' => $cid,
                ]
            );
            if ($t['code'] === '3001') {
                $firstTechId = $user->id;
            }
        }

        // Hand up to 3 currently-unassigned open/assigned tickets in this company
        // to technician 3001, so /maintenance/tickets has content on first login.
        // Idempotent: only picks tickets that aren't assigned to anyone yet.
        if ($firstTechId) {
            $ticketIds = DB::table('maintenance_tickets')
                ->where('company_id', $cid)
                ->whereIn('status', ['open', 'assigned'])
                ->whereNull('assigned_to_user_id')
                ->orderBy('id')
                ->limit(3)
                ->pluck('id');

            foreach ($ticketIds as $ticketId) {
                DB::table('maintenance_tickets')->where('id', $ticketId)->update([
                    'assigned_to_user_id' => $firstTechId,
                    'assignee'            => 'Ravi Kumar',
                    'status'              => 'assigned',
                ]);
            }
        }
    }

    public function down(): void
    {
        // Un-assign the demo tickets and remove the seeded technicians.
        $techIds = User::query()->whereIn('employee_code', ['3001', '3002', '3003'])->pluck('id');
        if ($techIds->isNotEmpty()) {
            DB::table('maintenance_tickets')
                ->whereIn('assigned_to_user_id', $techIds->all())
                ->update(['assigned_to_user_id' => null, 'assignee' => null, 'status' => 'open']);
        }
        User::query()->whereIn('employee_code', ['3001', '3002', '3003'])->delete();
    }
};
