<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loyalty_earning_rules', function (Blueprint $t) {
            $t->id();
            $t->string('source')->default('');
            $t->decimal('multiplier', 5, 2)->default(1);
            $t->boolean('enabled')->default(true);
            $t->string('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_earning_rules');
    }
};
