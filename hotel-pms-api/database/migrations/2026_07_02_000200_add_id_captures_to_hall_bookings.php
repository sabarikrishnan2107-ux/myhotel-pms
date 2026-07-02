<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional guest ID + capture fields for hall bookings — mirrors the
 * check-in captures on `bookings`, but stores the base64/data-URI values
 * directly (no separate upload/verification step for this flow).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hall_bookings', function (Blueprint $t) {
            $t->string('idType')->nullable();
            $t->string('idNumber')->nullable();
            $t->text('guestPhoto')->nullable();
            $t->text('idFront')->nullable();
            $t->text('idBack')->nullable();
            $t->text('signature')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('hall_bookings', function (Blueprint $t) {
            $t->dropColumn(['idType', 'idNumber', 'guestPhoto', 'idFront', 'idBack', 'signature']);
        });
    }
};
