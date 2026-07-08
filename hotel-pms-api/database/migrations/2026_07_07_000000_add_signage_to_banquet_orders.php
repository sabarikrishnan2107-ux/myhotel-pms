<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('banquet_orders', function (Blueprint $t) {
            // Logistics → signage placement list (location + signage), mirroring
            // the other per-section JSON columns on this table.
            $t->json('signage')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('banquet_orders', function (Blueprint $t) {
            $t->dropColumn('signage');
        });
    }
};
