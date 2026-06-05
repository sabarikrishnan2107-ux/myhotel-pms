<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_rules', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('trigger')->nullable();
            $t->string('adjustment')->nullable();
            $t->boolean('enabled')->default(true);
            $t->string('scope')->default('All room types');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rules');
    }
};
