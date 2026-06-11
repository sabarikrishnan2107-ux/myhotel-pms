<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $t) {
            $t->id();
            $t->string('time')->default('');
            $t->string('itemName')->default('');
            $t->string('type')->default('Adjust');
            $t->integer('qty')->default(0);
            $t->string('reason')->nullable();
            $t->string('by')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
