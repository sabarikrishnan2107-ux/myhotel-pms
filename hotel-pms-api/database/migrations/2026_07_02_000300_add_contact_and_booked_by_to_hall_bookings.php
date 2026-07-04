<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hall_bookings', function (Blueprint $t) {
            $t->string('contactName')->nullable();   // who to coordinate with — may differ from `customer`
            $t->string('bookedBy')->nullable();       // "Direct" | "<agent name> (Agent)" | "<account name> (Corporate)"
        });
    }

    public function down(): void
    {
        Schema::table('hall_bookings', function (Blueprint $t) {
            $t->dropColumn(['contactName', 'bookedBy']);
        });
    }
};
