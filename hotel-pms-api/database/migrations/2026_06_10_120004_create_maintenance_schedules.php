<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance_schedules', function (Blueprint $t) {
            $t->id();
            $t->string('equipment')->default('');
            $t->string('area')->nullable();
            $t->string('category')->nullable();
            $t->string('frequency')->default('');
            $t->string('lastDone')->nullable();
            $t->string('nextDue')->nullable();
            $t->string('assignee')->nullable();
            $t->integer('durationMin')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_schedules');
    }
};
