<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Housekeeping task log — one row per room cleaning assignment so the office
 * can see who cleaned what and how long it took.
 * status: assigned | accepted | done
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('housekeeping_tasks', function (Blueprint $t) {
            $t->id();
            $t->string('room')->default('');
            $t->string('roomType')->default('');
            $t->string('assignee')->index();
            $t->string('assignedBy')->nullable();
            $t->string('status')->default('assigned');
            $t->string('assignedAt')->default('');
            $t->string('startedAt')->nullable();
            $t->string('completedAt')->nullable();
            $t->integer('durationMin')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('housekeeping_tasks');
    }
};
