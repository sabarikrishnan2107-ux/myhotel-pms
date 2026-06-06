<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_tiers', function (Blueprint $t) {
            $t->id();
            $t->string('level')->default('');
            $t->integer('minSpend')->default(0);
            $t->integer('minNights')->default(0);
            $t->decimal('pointsRate', 5, 2)->default(1);
            $t->integer('discountPct')->default(0);
            $t->string('roomUpgrade')->default('None');
            $t->string('lateCheckout')->nullable();
            $t->string('earlyCheckin')->nullable();
            $t->boolean('freeBreakfast')->default(false);
            $t->boolean('welcomeDrink')->default(false);
            $t->boolean('priorityBooking')->default(false);
            $t->boolean('vipTag')->default(false);
            $t->string('color')->nullable();
            $t->json('perks')->nullable();
            $t->timestamps();
        });

        Schema::create('loyalty_rewards', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('category')->default('Stay');
            $t->integer('pointsCost')->default(0);
            $t->integer('cashValue')->default(0);
            $t->string('description')->nullable();
            $t->string('minTier')->default('Silver');
            $t->boolean('active')->default(true);
            $t->string('icon')->nullable();
            $t->timestamps();
        });

        Schema::create('loyalty_campaigns', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('type')->default('Discount');
            $t->string('description')->nullable();
            $t->string('validFrom')->nullable();
            $t->string('validTo')->nullable();
            $t->json('applicableTiers')->nullable();
            $t->json('applicableRoomTypes')->nullable();
            $t->integer('minBookingAmount')->default(0);
            $t->string('rewardValue')->nullable();
            $t->boolean('active')->default(true);
            $t->integer('redemptions')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_campaigns');
        Schema::dropIfExists('loyalty_rewards');
        Schema::dropIfExists('loyalty_tiers');
    }
};
