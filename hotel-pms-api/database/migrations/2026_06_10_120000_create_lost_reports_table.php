<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lost_reports', function (Blueprint $t) {
            $t->id();
            $t->string('reportNo')->default('');
            $t->string('guest')->default('');
            $t->string('phone')->nullable();
            $t->string('email')->nullable();
            $t->boolean('isWalkIn')->default(false);
            $t->string('room')->nullable();
            $t->string('stayFrom')->nullable();
            $t->string('stayTo')->nullable();
            $t->string('itemCategory')->default('Miscellaneous');
            $t->string('itemName')->default('');
            $t->string('brand')->nullable();
            $t->string('color')->nullable();
            $t->text('description')->nullable();
            $t->string('identification')->nullable();
            $t->boolean('hasPhoto')->default(false);
            $t->string('lostDate')->nullable();
            $t->string('lostTime')->nullable();
            $t->string('lastSeen')->nullable();
            $t->string('reportedOn')->nullable();
            $t->string('urgency')->default('Medium');
            $t->string('status')->default('Reported');
            $t->string('contactMode')->default('Phone call');
            $t->text('remarks')->nullable();
            $t->integer('estValue')->nullable();
            $t->boolean('hvi')->default(false);
            $t->json('timeline')->nullable();
            $t->json('matches')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_reports');
    }
};
