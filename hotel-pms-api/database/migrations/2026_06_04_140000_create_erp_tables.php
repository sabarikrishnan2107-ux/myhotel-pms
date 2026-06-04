<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('role')->default('');
            $t->string('dept')->default('');
            $t->string('phone')->default('');
            $t->string('email')->default('');
            $t->string('joined')->default('');
            $t->integer('salary')->default(0);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });

        Schema::create('vendors', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('contact')->default('');
            $t->string('phone')->default('');
            $t->string('terms')->default('Net 30');
            $t->bigInteger('outstanding')->default(0);
            $t->string('lastInvoice')->default('');
            $t->timestamps();
        });

        Schema::create('inventory_items', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('cat')->default('');
            $t->string('vendor')->default('');
            $t->integer('qty')->default(0);
            $t->integer('min')->default(0);
            $t->string('unit')->default('pcs');
            $t->string('lastPurchase')->default('');
            $t->decimal('price', 10, 2)->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('inventory_items');
    }
};
