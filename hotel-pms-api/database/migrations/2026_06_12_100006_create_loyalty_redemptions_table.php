<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_redemptions', function (Blueprint $t) {
            $t->id();
            $t->string('date')->default('');
            $t->string('memberId')->default('');
            $t->string('memberName')->default('');
            $t->string('rewardId')->nullable();
            $t->string('rewardName')->default('');
            $t->integer('pointsUsed')->default(0);
            $t->string('bookingNo')->nullable();
            $t->string('status')->default('Pending');
            $t->string('staff')->default('');
            $t->string('approver')->nullable();
            $t->string('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_redemptions');
    }
};
