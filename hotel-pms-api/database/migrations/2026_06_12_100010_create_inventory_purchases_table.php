<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_purchases', function (Blueprint $t) {
            $t->id();
            $t->string('date')->default('');
            $t->string('billNo')->default('');
            $t->string('billDate')->default('');
            $t->string('vendor')->default('');
            $t->string('vendorGstin')->nullable();
            $t->string('vendorPan')->nullable();
            $t->string('vendorPhone')->nullable();
            $t->string('category')->default('Other');
            $t->string('department')->default('Kitchen');
            $t->json('lines')->nullable();
            $t->integer('discount')->default(0);
            $t->integer('freight')->default(0);
            $t->integer('roundOff')->default(0);
            $t->boolean('interState')->default(false);
            $t->string('paymentStatus')->default('Unpaid');
            $t->string('paymentMode')->nullable();
            $t->string('paymentDate')->nullable();
            $t->string('paymentRef')->nullable();
            $t->integer('paidAmount')->default(0);
            $t->string('receivedBy')->default('');
            $t->string('qcStatus')->default('Pending QC');
            $t->string('storage')->default('Main Pantry');
            $t->text('billPhoto')->nullable();
            $t->json('goodsPhotos')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_purchases');
    }
};
