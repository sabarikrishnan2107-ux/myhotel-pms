<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * service_items was created after the one-time
 * add_company_id_to_remaining_tenant_tables backfill, so rows seeded by
 * ServiceItemSeeder (which, like every other seeder, doesn't set
 * company_id explicitly) are left NULL and invisible to any
 * company-scoped login. Mirrors that migration's exact backfill logic,
 * scoped to just this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        $defaultId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');
        if ($defaultId) {
            DB::table('service_items')->whereNull('company_id')->update(['company_id' => $defaultId]);
        }
    }

    public function down(): void
    {
        // Intentionally left blank — reverting would re-orphan rows with no
        // way to know which were NULL before this migration ran.
    }
};
