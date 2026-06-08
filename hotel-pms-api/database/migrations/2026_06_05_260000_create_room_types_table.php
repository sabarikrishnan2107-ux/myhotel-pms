<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_types', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('code')->nullable();
            $t->integer('baseTariff')->default(0);
            $t->integer('maxAdults')->default(2);
            $t->integer('maxChildren')->default(1);
            $t->integer('sizeSqft')->nullable();
            $t->string('description')->nullable();
            $t->json('amenities')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_types');
    }
};
