<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('table_reservations', function (Blueprint $t) {
            // When the party was actually seated / finished — used to measure
            // real dwell time and turn-time analytics (ISO datetime strings).
            $t->string('seatedAt')->nullable();
            $t->string('completedAt')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('table_reservations', function (Blueprint $t) {
            $t->dropColumn(['seatedAt', 'completedAt']);
        });
    }
};
