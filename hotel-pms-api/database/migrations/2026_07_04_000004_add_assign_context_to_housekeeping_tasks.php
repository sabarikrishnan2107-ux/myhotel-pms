<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Assignment context shown in the mobile popup + the cleaning outcome:
 *  - guestName : customer in the room (for the "Room 205 · John Doe" popup)
 *  - roomState : occupied | dirty (drives the popup icon)
 *  - outcome   : ready | maintenance (chosen from the 😊/😠 popup at Stop)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            if (! Schema::hasColumn('housekeeping_tasks', 'guestName')) {
                $t->string('guestName')->nullable();
            }
            if (! Schema::hasColumn('housekeeping_tasks', 'roomState')) {
                $t->string('roomState')->nullable();
            }
            if (! Schema::hasColumn('housekeeping_tasks', 'outcome')) {
                $t->string('outcome')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            $t->dropColumn(['guestName', 'roomState', 'outcome']);
        });
    }
};
