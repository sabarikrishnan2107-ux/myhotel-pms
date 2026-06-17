<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Guest service requests (towels, transport, dining, etc.) raised from the
 * front desk / mobile app and worked by staff. status: new | in-progress | done.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guest_requests', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');
            $t->string('room')->default('');
            $t->string('guestName')->default('');
            $t->string('type')->default('Amenity');   // Amenity | Transport | Dining | Housekeeping | Other
            $t->string('title')->default('');
            $t->string('status')->default('new');       // new | in-progress | done
            $t->string('assignee')->nullable();
            $t->string('requestedAt')->default('');
            $t->string('notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_requests');
    }
};
