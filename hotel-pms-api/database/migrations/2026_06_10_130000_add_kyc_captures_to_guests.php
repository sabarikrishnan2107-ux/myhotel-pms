<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $t) {
            // KYC captures — stored as base64 data URLs (image/PDF/signature PNG).
            $t->text('idFront')->nullable();
            $t->text('idBack')->nullable();
            $t->text('photo')->nullable();
            $t->text('signature')->nullable();
            // Other profile fields the intake form collects.
            $t->string('gender')->nullable();
            $t->string('company')->nullable();
            $t->string('gst')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $t) {
            $t->dropColumn(['idFront', 'idBack', 'photo', 'signature', 'gender', 'company', 'gst']);
        });
    }
};
