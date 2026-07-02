<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hall_bookings', function (Blueprint $t) {
            $t->string('endDate')->default('');   // event end date — defaults to `date` for same-day events
        });
    }

    public function down(): void
    {
        Schema::table('hall_bookings', function (Blueprint $t) {
            $t->dropColumn('endDate');
        });
    }
};
