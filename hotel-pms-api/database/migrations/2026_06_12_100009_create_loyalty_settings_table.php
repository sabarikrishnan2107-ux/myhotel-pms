<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loyalty_settings', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->decimal('pointsValueRupees', 8, 2)->default(0.5);
            $t->integer('pointsExpiryMonths')->default(24);
            $t->boolean('taxBeforeDiscount')->default(false);
            $t->integer('approvalRequiredAbove')->default(2000);
            $t->boolean('manualAdjustNeedsApproval')->default(true);
            $t->boolean('redemptionOtp')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_settings');
    }
};
