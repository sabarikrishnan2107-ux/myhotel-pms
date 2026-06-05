<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_bookings', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');
            $t->string('name')->default('');
            $t->string('type')->default('Other');
            $t->string('contactName')->default('');
            $t->string('contactPhone')->nullable();
            $t->string('contactEmail')->nullable();
            $t->string('bookedBy')->nullable();
            $t->string('arrival')->default('');
            $t->string('departure')->default('');
            $t->integer('nights')->default(0);
            $t->json('block')->nullable();
            $t->integer('totalRooms')->default(0);
            $t->integer('totalPax')->default(0);
            $t->string('ratePlan')->nullable();
            $t->json('services')->nullable();
            $t->integer('total')->default(0);
            $t->integer('advance')->default(0);
            $t->integer('balance')->default(0);
            $t->string('status')->default('tentative');
            $t->text('notes')->nullable();
            $t->string('createdAt')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_bookings');
    }
};
