<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compliance_licenses', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('authority')->default('');
            $t->string('number')->nullable();
            $t->string('issueDate')->nullable();
            $t->string('expiryDate')->nullable();
            $t->integer('daysToExpiry')->default(0);
            $t->integer('fee')->default(0);
            $t->string('status')->default('active');   // active | expiring_soon | expired | in_renewal
            $t->json('documents')->nullable();
            $t->json('reminders')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_licenses');
    }
};
