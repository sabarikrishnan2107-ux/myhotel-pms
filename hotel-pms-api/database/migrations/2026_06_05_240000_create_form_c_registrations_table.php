<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_c_registrations', function (Blueprint $t) {
            $t->id();
            $t->string('guestName')->default('');
            $t->string('passportNo')->nullable();
            $t->string('nationality')->nullable();
            $t->string('visaNo')->nullable();
            $t->string('visaExpiry')->nullable();
            $t->string('arrivalAt')->nullable();
            $t->string('departureAt')->nullable();
            $t->string('roomNo')->nullable();
            $t->boolean('reportedToFrro')->default(false);
            $t->string('reportedAt')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_c_registrations');
    }
};
