<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folio_adjustments', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->index();
            $t->string('date')->default('');         // YYYY-MM-DD
            $t->string('type')->default('Discount');  // Discount | Comp
            $t->string('description')->default('');
            $t->integer('amount')->default(0);         // signed; comps/discounts negative
            $t->string('approver')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('folio_adjustments');
    }
};
