<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Media on maintenance tickets so a housekeeper can report broken/damaged items
 * with a photo, a typed note (description) and a recorded voice message.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_tickets', function (Blueprint $t) {
            if (! Schema::hasColumn('maintenance_tickets', 'description')) {
                $t->text('description')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'photos')) {
                $t->json('photos')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'voiceUrl')) {
                $t->string('voiceUrl')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_tickets', function (Blueprint $t) {
            $t->dropColumn(['description', 'photos', 'voiceUrl']);
        });
    }
};
