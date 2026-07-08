<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Itemised breakdown for an order posted to a folio (kitchen / room service /
 * laundry). Stored as JSON: [{ name, qty, price }]. Lets the folio show exactly
 * what was ordered, at what price — not just a "· N items" summary.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('folio_charges', function (Blueprint $t) {
            $t->json('items')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('folio_charges', function (Blueprint $t) {
            $t->dropColumn('items');
        });
    }
};
