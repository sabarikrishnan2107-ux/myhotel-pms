<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('recipes', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('category')->default('');
            $t->integer('menuPrice')->default(0);
            $t->integer('portions')->default(1);
            $t->integer('prepMin')->default(0);
            $t->integer('cookMin')->default(0);
            $t->integer('labour')->default(0);
            $t->integer('overhead')->default(0);
            $t->text('description')->nullable();
            $t->json('ingredients')->nullable();
            $t->json('allergens')->nullable();
            $t->json('nutrition')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipes');
    }
};
