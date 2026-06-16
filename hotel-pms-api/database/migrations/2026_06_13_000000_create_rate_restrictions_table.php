<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rate_restrictions', function (Blueprint $t) {
            $t->id();
            $t->string('fromIso')->default('');         // YYYY-MM-DD
            $t->string('toIso')->default('');           // YYYY-MM-DD
            $t->string('roomType')->default('all');     // all | standard | deluxe | suite | villa
            $t->string('kind')->default('minlos');      // minlos | maxlos | cta | ctd
            $t->string('value')->default('');           // human label, e.g. "MinLOS 2 nights"
            $t->string('appliedBy')->default('');
            $t->string('appliedAt')->nullable();
            $t->json('channels')->nullable();           // ["Booking.com", "Agoda", ...]
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_restrictions');
    }
};
