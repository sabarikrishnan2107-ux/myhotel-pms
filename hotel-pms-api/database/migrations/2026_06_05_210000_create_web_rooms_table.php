<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('web_rooms', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->integer('price')->default(0);
            $t->string('image')->nullable();
            $t->string('desc')->nullable();
            $t->boolean('published')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('web_rooms');
    }
};
