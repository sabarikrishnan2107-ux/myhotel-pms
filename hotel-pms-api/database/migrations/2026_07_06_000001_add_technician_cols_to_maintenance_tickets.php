<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Maintenance technician mobile-app lifecycle. Mirrors the housekeeping task
 * lifecycle columns but on maintenance_tickets: link a ticket to the technician
 * who claimed it, record start/resolve timestamps, before/after (damage/repair)
 * photos, parts used, work notes + a work voice memo, and the outcome.
 *
 *   open → assigned → in-progress → resolved   (escalate re-opens into the queue)
 *
 * All additive + guarded so it is safe to run against the live DB.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('maintenance_tickets', function (Blueprint $t) {
            if (! Schema::hasColumn('maintenance_tickets', 'assigned_to_user_id')) {
                $t->unsignedBigInteger('assigned_to_user_id')->nullable()->index();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'started_at')) {
                $t->timestamp('started_at')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'resolved_at')) {
                $t->timestamp('resolved_at')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'photos_before')) {
                $t->json('photos_before')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'photos_after')) {
                $t->json('photos_after')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'parts')) {
                $t->json('parts')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'work_notes')) {
                $t->text('work_notes')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'work_voice_url')) {
                $t->string('work_voice_url')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'outcome')) {
                $t->string('outcome')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'total_minutes')) {
                $t->integer('total_minutes')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'reported_by')) {
                $t->string('reported_by')->nullable();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'room_id')) {
                $t->unsignedBigInteger('room_id')->nullable()->index();
            }
            if (! Schema::hasColumn('maintenance_tickets', 'floor')) {
                $t->integer('floor')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('maintenance_tickets', function (Blueprint $t) {
            $t->dropColumn([
                'assigned_to_user_id', 'started_at', 'resolved_at',
                'photos_before', 'photos_after', 'parts', 'work_notes',
                'work_voice_url', 'outcome', 'total_minutes', 'reported_by',
                'room_id', 'floor',
            ]);
        });
    }
};
