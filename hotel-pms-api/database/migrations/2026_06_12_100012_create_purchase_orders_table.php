<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $t) {
            $t->id();
            $t->string('po')->default('');
            $t->string('vendor')->default('');
            $t->integer('items')->default(0);
            $t->integer('amount')->default(0);
            $t->string('date')->default('');
            $t->string('status')->default('Draft');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
