<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('ota_bookings', function (Blueprint $t) {
            $t->id();
            $t->string('channel')->default('');
            $t->string('booking')->default('');
            $t->string('guest')->default('');
            $t->string('room')->nullable();
            $t->string('checkIn')->nullable();
            $t->integer('nights')->default(0);
            $t->string('status')->default('confirmed');
            $t->integer('total')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ota_bookings');
    }
};
