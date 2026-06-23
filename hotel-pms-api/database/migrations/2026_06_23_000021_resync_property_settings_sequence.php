<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (DB::getDriverName() !== 'pgsql' || !Schema::hasTable('property_settings')) return;
        // resync the id sequence to MAX(id) so auto-increment inserts don't collide with the legacy id=1 row
        DB::statement("SELECT setval(pg_get_serial_sequence('property_settings','id'), (SELECT COALESCE(MAX(id),1) FROM property_settings))");
    }
    public function down(): void { /* no-op */ }
};
