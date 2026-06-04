<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Folio = a booking's running bill. Charges and payments are linked to a
 * booking by its bookingNo (the natural key the folio screens use).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folio_charges', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->index();
            $t->string('date')->default('');
            $t->string('description')->default('');
            $t->string('type')->default('Extra'); // Room | F&B | Tax | Extra | Discount | Service
            $t->integer('qty')->default(1);
            $t->integer('rate')->default(0);
            $t->integer('tax')->default(0);
            $t->integer('amount')->default(0);   // signed (discounts/comps are negative)
            $t->string('paidBy')->default('Guest'); // Guest | Agent | Company
            $t->timestamps();
        });

        Schema::create('folio_payments', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->index();
            $t->string('date')->default('');
            $t->string('mode')->default('Cash');
            $t->string('reference')->nullable();
            $t->integer('amount')->default(0);   // signed (refunds are negative)
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folio_charges');
        Schema::dropIfExists('folio_payments');
    }
};
