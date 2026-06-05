<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_members', function (Blueprint $t) {
            $t->id();
            $t->string('membershipId')->default('');
            $t->string('name')->default('');
            $t->string('phone')->default('');
            $t->string('email')->default('');
            $t->string('dob')->nullable();
            $t->string('anniversary')->nullable();
            $t->string('address')->nullable();
            $t->string('nationality')->default('India');
            $t->string('idType')->default('');
            $t->string('idNumber')->default('');
            $t->string('joinedAt')->default('');
            $t->string('tier')->default('Silver');
            $t->integer('pointsBalance')->default(0);
            $t->integer('lifetimePoints')->default(0);
            $t->integer('lifetimeStays')->default(0);
            $t->integer('lifetimeNights')->default(0);
            $t->bigInteger('lifetimeSpend')->default(0);
            $t->string('lastStayDate')->nullable();
            $t->json('upcomingBooking')->nullable();
            $t->json('preferences')->nullable();
            $t->text('staffNotes')->nullable();
            $t->boolean('consentMarketing')->default(true);
            $t->boolean('blocked')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_members');
    }
};
