<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            // Housekeeper currently assigned to clean the room, and when they started.
            $table->string('hkAssignee')->nullable();
            $table->string('hkStartedAt')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn(['hkAssignee', 'hkStartedAt']);
        });
    }
};
