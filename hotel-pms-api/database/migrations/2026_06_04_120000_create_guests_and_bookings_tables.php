<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guests', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('phone')->default('');
            $t->string('email')->default('');
            $t->string('nationality')->default('');
            $t->string('idType')->default('');
            $t->string('idNumber')->default('');
            $t->boolean('vip')->default(false);
            $t->boolean('blacklist')->default(false);
            $t->integer('lifetimeNights')->default(0);
            $t->bigInteger('lifetimeSpend')->default(0);
            $t->string('lastStay')->nullable();
            $t->string('address')->nullable();
            $t->string('birthday')->nullable();
            $t->string('anniversary')->nullable();
            $t->json('preferences')->nullable();
            $t->string('allergies')->nullable();
            $t->text('internalNotes')->nullable();
            $t->string('blacklistReason')->nullable();
            $t->integer('loyaltyPoints')->default(0);
            $t->timestamps();
        });

        Schema::create('bookings', function (Blueprint $t) {
            $t->id();
            $t->string('bookingNo')->default('');
            $t->string('guestName')->default('');
            $t->string('roomNumber')->default('');
            $t->string('roomType')->default('');
            $t->string('source')->default('Walk-in');
            $t->string('checkIn')->default('');
            $t->string('checkOut')->default('');
            $t->integer('nights')->default(1);
            $t->integer('adults')->default(1);
            $t->integer('children')->default(0);
            $t->string('paymentStatus')->default('unpaid');
            $t->string('ratePlan')->default('EP');
            $t->integer('total')->default(0);
            $t->integer('advance')->default(0);
            $t->integer('balance')->default(0);
            $t->boolean('vip')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('guests');
    }
};
