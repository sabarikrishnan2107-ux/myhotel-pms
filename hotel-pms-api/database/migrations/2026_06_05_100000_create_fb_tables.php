<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $t) {
            $t->id();
            $t->string('cat')->default('');
            $t->string('name')->default('');
            $t->integer('price')->default(0);
            $t->boolean('veg')->default(false);
            $t->string('spice')->nullable();
            $t->string('tag')->nullable();
            $t->timestamps();
        });

        Schema::create('fb_orders', function (Blueprint $t) {
            $t->id();
            $t->string('orderNo')->default('');
            $t->string('tableNo')->default('');
            $t->string('server')->nullable();
            $t->json('items')->nullable();
            $t->integer('total')->default(0);
            $t->string('status')->default('placed'); // placed | preparing | ready | served | paid
            $t->string('paymentMethod')->nullable();
            $t->string('room')->nullable();           // set when charged to a room folio
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fb_orders');
        Schema::dropIfExists('menu_items');
    }
};
