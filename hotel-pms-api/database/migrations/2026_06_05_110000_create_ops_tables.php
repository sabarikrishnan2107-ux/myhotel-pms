<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_tickets', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');
            $t->string('room')->default('');
            $t->string('title')->default('');
            $t->string('priority')->default('normal');
            $t->string('status')->default('open');
            $t->string('assignee')->nullable();
            $t->string('reported')->default('');
            $t->string('category')->default('General');
            $t->timestamps();
        });

        Schema::create('enquiries', function (Blueprint $t) {
            $t->id();
            $t->string('enqNo')->default('');
            $t->string('type')->default('Room');
            $t->string('name')->default('');
            $t->string('phone')->default('');
            $t->string('email')->default('');
            $t->string('company')->nullable();
            $t->string('source')->default('Phone');
            $t->string('status')->default('new');
            $t->integer('roomNights')->nullable();
            $t->integer('roomCount')->nullable();
            $t->string('hallName')->nullable();
            $t->integer('guestCount')->nullable();
            $t->string('checkIn')->nullable();
            $t->string('checkOut')->nullable();
            $t->string('eventDate')->nullable();
            $t->integer('budget')->nullable();
            $t->integer('quotedAmount')->nullable();
            $t->string('enquiredOn')->default('');
            $t->string('assignedTo')->default('');
            $t->string('nextFollowUp')->nullable();
            $t->json('followUps')->nullable();
            $t->text('notes')->nullable();
            $t->boolean('thankYouSent')->default(false);
            $t->boolean('vip')->default(false);
            $t->timestamps();
        });

        Schema::create('found_items', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('brand')->nullable();
            $t->string('color')->nullable();
            $t->string('size')->nullable();
            $t->integer('qty')->default(1);
            $t->string('category')->default('Other');
            $t->string('foundAt')->nullable();
            $t->string('foundLocation')->nullable();
            $t->string('foundDate')->default('');
            $t->string('foundTime')->nullable();
            $t->string('foundBy')->nullable();
            $t->string('staffId')->nullable();
            $t->string('department')->nullable();
            $t->integer('value')->default(0);
            $t->boolean('hvi')->default(false);
            $t->string('condition')->default('Good');
            $t->text('description')->nullable();
            $t->string('storageLocation')->nullable();
            $t->string('storageShelf')->nullable();
            $t->string('status')->default('stored');
            $t->integer('daysHeld')->default(0);
            $t->string('guestName')->nullable();
            $t->string('reservation')->nullable();
            $t->string('checkIn')->nullable();
            $t->string('checkOut')->nullable();
            $t->string('contact')->nullable();
            $t->string('email')->nullable();
            $t->text('remarks')->nullable();
            $t->json('timeline')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_tickets');
        Schema::dropIfExists('enquiries');
        Schema::dropIfExists('found_items');
    }
};
