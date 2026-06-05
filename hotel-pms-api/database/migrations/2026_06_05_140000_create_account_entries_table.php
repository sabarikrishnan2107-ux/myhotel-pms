<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_entries', function (Blueprint $t) {
            $t->id();
            $t->string('date')->default('');
            $t->string('type')->default('income');   // income | expense | refund
            $t->string('category')->default('');
            $t->string('description')->default('');
            $t->integer('amount')->default(0);
            $t->string('mode')->default('');
            $t->string('ref')->nullable();
            // India GST compliance
            $t->string('vendor')->nullable();
            $t->string('gstin')->nullable();
            $t->integer('cgst')->nullable();
            $t->integer('sgst')->nullable();
            $t->integer('igst')->nullable();
            $t->string('hsnSac')->nullable();
            $t->string('voucherNo')->nullable();
            $t->json('lines')->nullable();
            $t->json('attachment')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_entries');
    }
};
