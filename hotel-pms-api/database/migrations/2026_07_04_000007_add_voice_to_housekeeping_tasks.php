<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Voice message that can accompany the completion notes on a task.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            if (! Schema::hasColumn('housekeeping_tasks', 'voiceUrl')) {
                $t->string('voiceUrl')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            $t->dropColumn('voiceUrl');
        });
    }
};
