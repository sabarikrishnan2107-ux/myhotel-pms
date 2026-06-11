<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bar_pour_costs', function (Blueprint $t) {
            $t->id();
            $t->string('category');
            $t->integer('soldValue')->default(0);
            $t->integer('theoreticalCost')->default(0);
            $t->integer('actualCost')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bar_pour_costs');
    }
};
