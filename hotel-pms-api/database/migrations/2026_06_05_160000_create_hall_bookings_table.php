<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hall_bookings', function (Blueprint $t) {
            $t->id();
            $t->string('customer')->default('');
            $t->string('phone')->nullable();
            $t->string('hall')->default('');
            $t->string('date')->default('');
            $t->string('start')->default('');
            $t->string('end')->default('');
            $t->integer('guests')->default(0);
            $t->string('package')->nullable();
            $t->integer('advance')->default(0);
            $t->integer('total')->default(0);
            $t->string('status')->default('pending');   // pending | confirmed | in-progress | cancelled
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hall_bookings');
    }
};
