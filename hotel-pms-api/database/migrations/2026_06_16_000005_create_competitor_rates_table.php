<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('competitor_rates', function (Blueprint $t) {
            $t->id();
            $t->string('competitorId')->index();   // slug, e.g. westin
            $t->string('date')->default('');        // YYYY-MM-DD
            $t->string('roomType')->default('');
            $t->integer('rate')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('competitor_rates');
    }
};
