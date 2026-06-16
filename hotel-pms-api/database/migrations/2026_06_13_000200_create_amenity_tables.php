<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $cols = function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('category')->default('Other');
            $t->integer('qty')->default(0);
            $t->string('unit')->default('pcs');
            $t->string('purchaseDate')->nullable();
            $t->integer('purchasePrice')->default(0);
            $t->string('vendor')->nullable();
            $t->string('condition')->default('Good');
            $t->string('location')->default('');
            $t->text('photo')->nullable();      // emoji fallback or base64 data URL
            $t->text('remark')->nullable();
            $t->timestamps();
        };

        Schema::create('kitchen_amenities', $cols);
        Schema::create('room_amenities', function (Blueprint $t) use ($cols) {
            $cols($t);
            $t->integer('perRoom')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kitchen_amenities');
        Schema::dropIfExists('room_amenities');
    }
};
