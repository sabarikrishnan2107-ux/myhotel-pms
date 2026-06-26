<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Check-in verification documents captured by the Hotel Client mobile app.
 * Stores the uploaded asset URLs + status on the booking record so the
 * front desk can see who verified the guest and when.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->string('guest_photo')->nullable();
            $t->string('id_front')->nullable();
            $t->string('id_back')->nullable();
            $t->text('signature')->nullable();
            $t->string('verification_status')->default('not_started');
            $t->string('uploaded_by')->nullable();
            $t->timestamp('uploaded_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->dropColumn([
                'guest_photo',
                'id_front',
                'id_back',
                'signature',
                'verification_status',
                'uploaded_by',
                'uploaded_at',
            ]);
        });
    }
};
