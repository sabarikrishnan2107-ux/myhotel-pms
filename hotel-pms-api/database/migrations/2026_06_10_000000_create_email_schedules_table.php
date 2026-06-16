<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_schedules', function (Blueprint $t) {
            $t->id();
            $t->string('label')->default('');
            $t->string('frequency')->default('daily');   // daily | weekly | monthly
            $t->string('time')->default('08:00');
            $t->json('recipients')->nullable();          // ["owner@x.in", "+91 98..."]
            $t->string('format')->default('pdf');        // pdf | html | both
            $t->json('sections')->nullable();            // ["KPIs", "Revenue", ...]
            $t->boolean('enabled')->default(true);
            $t->string('lastSentAt')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_schedules');
    }
};
