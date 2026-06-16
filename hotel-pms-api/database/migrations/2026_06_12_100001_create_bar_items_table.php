<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bar_items', function (Blueprint $t) {
            $t->id();
            $t->string('brand');
            $t->string('category');
            $t->string('size');
            $t->decimal('opened', 6, 2)->default(0);
            $t->integer('sealed')->default(0);
            $t->integer('par')->default(0);
            $t->integer('reorderQty')->default(0);
            $t->integer('unitCost')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bar_items');
    }
};
