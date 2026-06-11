<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_runs', function (Blueprint $t) {
            $t->id();
            $t->string('date')->default('');
            $t->string('runAt')->default('');
            $t->string('duration')->default('');
            $t->string('status')->default('success');
            $t->integer('occupancy')->default(0);
            $t->integer('revenue')->default(0);
            $t->integer('noShows')->default(0);
            $t->integer('cashVariance')->default(0);
            $t->json('anomalies')->nullable();
            $t->boolean('irn')->default(true);
            $t->boolean('backup')->default(true);
            $t->json('steps')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_runs');
    }
};
