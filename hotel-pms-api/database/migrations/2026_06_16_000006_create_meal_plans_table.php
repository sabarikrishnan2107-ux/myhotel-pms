<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meal_plans', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');         // EP | CP | MAP | AP | BQ
            $t->string('name')->default('');
            $t->integer('perPaxPerDay')->default(0);
            $t->string('desc')->nullable();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_plans');
    }
};
