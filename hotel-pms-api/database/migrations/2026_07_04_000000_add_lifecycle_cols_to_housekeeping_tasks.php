<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Housekeeping mobile-app lifecycle: link a task to a real room + login user,
 * and record the acknowledge step. The existing columns (room, roomType,
 * assignee, assignedBy, status, assignedAt, startedAt, completedAt, durationMin,
 * type, priority, notes, company_id) are reused.
 *
 * Expanded status vocabulary:
 *   assigned → acknowledged → before_photos → in_progress → after_photos → completed
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            if (! Schema::hasColumn('housekeeping_tasks', 'roomId')) {
                $t->unsignedBigInteger('roomId')->nullable();
            }
            if (! Schema::hasColumn('housekeeping_tasks', 'floor')) {
                $t->integer('floor')->nullable();
            }
            if (! Schema::hasColumn('housekeeping_tasks', 'assignedToUserId')) {
                $t->unsignedBigInteger('assignedToUserId')->nullable()->index();
            }
            if (! Schema::hasColumn('housekeeping_tasks', 'assignedByUserId')) {
                $t->unsignedBigInteger('assignedByUserId')->nullable();
            }
            if (! Schema::hasColumn('housekeeping_tasks', 'acknowledgedAt')) {
                $t->string('acknowledgedAt')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            $t->dropColumn(['roomId', 'floor', 'assignedToUserId', 'assignedByUserId', 'acknowledgedAt']);
        });
    }
};
