<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Guest address read off the scanned ID (e.g. the Aadhaar back) by the mobile
 * app's OCR, stored alongside the ID type/number so the front desk forms can be
 * auto-filled. Left null when the card carries no address.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->text('id_address')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $t) {
            $t->dropColumn('id_address');
        });
    }
};
