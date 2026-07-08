<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link found items + maintenance tickets back to the housekeeping task they were
 * reported from, so the Cleaning Report can show "reported during cleaning".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('found_items', function (Blueprint $t) {
            if (! Schema::hasColumn('found_items', 'hkTaskId')) {
                $t->unsignedBigInteger('hkTaskId')->nullable()->index();
            }
        });
        Schema::table('maintenance_tickets', function (Blueprint $t) {
            if (! Schema::hasColumn('maintenance_tickets', 'hkTaskId')) {
                $t->unsignedBigInteger('hkTaskId')->nullable()->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('found_items', fn (Blueprint $t) => $t->dropColumn('hkTaskId'));
        Schema::table('maintenance_tickets', fn (Blueprint $t) => $t->dropColumn('hkTaskId'));
    }
};
