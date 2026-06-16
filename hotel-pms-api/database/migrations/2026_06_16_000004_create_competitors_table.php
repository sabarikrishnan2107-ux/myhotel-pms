<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competitors', function (Blueprint $t) {
            $t->id();
            $t->string('slug')->nullable()->index();   // stable key linking to competitor_rates
            $t->string('hotel')->default('');
            $t->string('brand')->nullable();
            $t->decimal('km', 6, 2)->default(0);
            $t->integer('stars')->default(3);
            $t->string('source')->default('');     // Booking.com | Agoda | ...
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competitors');
    }
};
