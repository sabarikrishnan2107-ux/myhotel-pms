<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashier_shifts', function (Blueprint $t) {
            $t->id();
            $t->integer('number')->default(0);
            $t->string('cashier')->default('');
            $t->string('startedAt')->default('');
            $t->string('endsAt')->default('');
            $t->integer('opening')->default(0);
            $t->integer('refunds')->default(0);
            $t->integer('expenses')->default(0);
            $t->string('status')->default('open');     // open | closed
            $t->integer('physicalCount')->nullable();
            $t->integer('variance')->nullable();
            $t->text('varianceRemarks')->nullable();
            $t->text('handoverNotes')->nullable();
            $t->string('closedAt')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashier_shifts');
    }
};
