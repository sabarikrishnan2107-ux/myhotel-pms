<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bar_purchase_orders', function (Blueprint $t) {
            $t->id();
            $t->string('poNo');
            $t->string('vendor');
            $t->string('items');
            $t->integer('itemCount')->default(0);
            $t->integer('value')->default(0);
            $t->string('raised')->nullable();
            $t->string('eta')->nullable();
            $t->string('status')->default('Pending');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bar_purchase_orders');
    }
};
