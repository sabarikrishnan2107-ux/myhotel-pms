<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_wastage', function (Blueprint $t) {
            $t->id();
            $t->string('date')->default('');
            $t->string('item')->default('');
            $t->integer('qty')->default(0);
            $t->integer('cost')->default(0);
            $t->string('reason')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_wastage');
    }
};
