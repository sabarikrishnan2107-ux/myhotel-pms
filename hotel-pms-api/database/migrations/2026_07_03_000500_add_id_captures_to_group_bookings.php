<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional booker ID + capture fields for group bookings — the identification
 * of the person who books the group (the primary contact). Mirrors the hall
 * booking captures: base64/data-URI values stored directly, no tablet hand-off.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_bookings', function (Blueprint $t) {
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
        Schema::table('group_bookings', function (Blueprint $t) {
            $t->dropColumn(['idType', 'idNumber', 'guestPhoto', 'idFront', 'idBack', 'signature']);
        });
    }
};
