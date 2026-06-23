<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = ['property_settings', 'roles', 'app_settings'];

    public function up(): void {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && !Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, fn (Blueprint $b) => $b->unsignedBigInteger('company_id')->nullable()->index());
            }
        }
        if (Schema::hasTable('app_settings')) {
            try { Schema::table('app_settings', fn (Blueprint $b) => $b->dropUnique('app_settings_key_unique')); } catch (\Throwable $e) {}
            Schema::table('app_settings', fn (Blueprint $b) => $b->unique(['company_id', 'key'], 'app_settings_company_key_unique'));
        }
        $defaultId = DB::table('master_companies')->where('code', 'DEFAULT-HOTEL')->value('id');
        if ($defaultId) {
            foreach ($this->tables as $t) {
                if (Schema::hasColumn($t, 'company_id')) {
                    DB::table($t)->whereNull('company_id')->update(['company_id' => $defaultId]);
                }
            }
        }
    }

    public function down(): void {
        if (Schema::hasTable('app_settings')) {
            try { Schema::table('app_settings', fn (Blueprint $b) => $b->dropUnique('app_settings_company_key_unique')); } catch (\Throwable $e) {}
            try { Schema::table('app_settings', fn (Blueprint $b) => $b->unique('key', 'app_settings_key_unique')); } catch (\Throwable $e) {}
        }
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, fn (Blueprint $b) => $b->dropColumn('company_id'));
            }
        }
    }
};
