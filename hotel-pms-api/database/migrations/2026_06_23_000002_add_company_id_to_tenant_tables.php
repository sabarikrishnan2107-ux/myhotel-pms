<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = ['users','guests','bookings','rooms','folio_charges','folio_payments','folio_adjustments'];
    public function up(): void {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && !Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, function (Blueprint $b) { $b->unsignedBigInteger('company_id')->nullable()->index(); });
            }
        }
    }
    public function down(): void {
        foreach ($this->tables as $t) {
            if (Schema::hasTable($t) && Schema::hasColumn($t, 'company_id')) {
                Schema::table($t, function (Blueprint $b) { $b->dropColumn('company_id'); });
            }
        }
    }
};
