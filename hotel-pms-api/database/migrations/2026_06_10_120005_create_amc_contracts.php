<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('amc_contracts', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('category')->nullable();
            $t->string('contactPerson')->nullable();
            $t->string('phone')->nullable();
            $t->string('email')->nullable();
            $t->string('address')->nullable();
            $t->string('contractStart')->nullable();
            $t->string('contractEnd')->nullable();
            $t->integer('annualFee')->default(0);
            $t->string('visitFrequency')->default('');
            $t->string('lastVisit')->nullable();
            $t->string('nextVisit')->nullable();
            $t->integer('slaResponseHours')->default(0);
            $t->string('status')->default('');
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amc_contracts');
    }
};
