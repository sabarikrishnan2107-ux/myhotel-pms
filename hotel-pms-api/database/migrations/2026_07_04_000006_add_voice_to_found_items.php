<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Voice note on a found item so a housekeeper can describe it by voice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('found_items', function (Blueprint $t) {
            if (! Schema::hasColumn('found_items', 'voiceUrl')) {
                $t->string('voiceUrl')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('found_items', function (Blueprint $t) {
            $t->dropColumn('voiceUrl');
        });
    }
};
