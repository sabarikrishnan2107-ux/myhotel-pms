<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banquet_packages', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('desc')->nullable();
            $t->integer('pricePerPax')->default(0);
            $t->boolean('veg')->default(false);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banquet_packages');
    }
};
