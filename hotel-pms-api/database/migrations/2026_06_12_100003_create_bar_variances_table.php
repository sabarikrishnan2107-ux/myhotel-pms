<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bar_variances', function (Blueprint $t) {
            $t->id();
            $t->string('sku')->default('');
            $t->string('category')->default('');
            $t->integer('theoreticalMl')->default(0);
            $t->integer('actualMl')->default(0);
            $t->integer('unitCost')->default(0);
            $t->string('flag')->nullable();
            $t->text('note')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bar_variances');
    }
};
