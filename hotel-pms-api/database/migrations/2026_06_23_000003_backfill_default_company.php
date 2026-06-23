<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

return new class extends Migration {
    public function up(): void {
        $now = Carbon::now();
        $defaultId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');
        if (!$defaultId) {
            $adminHash = Schema::hasColumn('users', 'password')
                ? DB::table('users')->where('email', 'admin@hotel.com')->value('password') : null;
            $defaultId = DB::table('master_companies')->insertGetId([
                'name' => 'Default Hotel', 'code' => 'DEFAULT-HOTEL',
                'admin_email' => 'admin@hotel.com', 'admin_password' => $adminHash,
                'valid_from' => '2020-01-01', 'valid_to' => '2999-12-31', 'plan' => 'enterprise',
                'max_branches' => 99, 'max_rooms' => 9999, 'max_employees' => 9999,
                'modules' => json_encode(['front_office','hk','accounts','hrms','pos','banquets','channel_mgr']),
                'status' => 'active', 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        foreach (['users','guests','bookings','rooms','folio_charges','folio_payments','folio_adjustments'] as $t) {
            if (Schema::hasColumn($t, 'company_id')) {
                DB::table($t)->whereNull('company_id')->update(['company_id' => $defaultId]);
            }
        }
    }
    public function down(): void { /* non-destructive */ }
};
