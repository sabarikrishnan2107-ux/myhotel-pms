<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('linen_items', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->integer('issued')->default(0);
            $t->integer('returned')->default(0);
            $t->integer('wastage')->default(0);
            $t->integer('inUse')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('linen_items');
    }
};
