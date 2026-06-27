<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Structured ID type + number captured alongside the verification documents,
 * so a tablet-synced booking carries the guest's ID details, not just images.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->string('id_type')->nullable();
            $t->string('id_number')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->dropColumn(['id_type', 'id_number']);
        });
    }
};
