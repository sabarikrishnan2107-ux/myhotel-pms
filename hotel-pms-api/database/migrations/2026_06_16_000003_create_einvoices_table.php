<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('einvoices', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->index();
            $t->string('irn', 64)->nullable();
            $t->string('ackNo')->nullable();
            $t->string('ackDate')->nullable();
            $t->string('status')->default('draft');     // draft | generated
            $t->string('placeOfSupply')->nullable();
            $t->string('recipientGstin')->nullable();
            $t->boolean('reverseCharge')->default(false);
            $t->json('signedJson')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('einvoices');
    }
};
