<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Message templates shown on the Notifications → Templates tab.
        Schema::create('notif_templates', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('trigger')->default('On booking');
            $t->json('channels')->nullable();          // ["Email", "WhatsApp", ...]
            $t->string('lastSent')->nullable();
            $t->timestamps();
        });

        // Delivery log shown on the Notifications → Delivery Log tab.
        Schema::create('notif_logs', function (Blueprint $t) {
            $t->id();
            $t->string('time')->default('');
            $t->string('to')->default('');
            $t->string('channel')->default('Email');
            $t->string('template')->default('');
            $t->string('status')->default('delivered'); // delivered | opened | bounced
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notif_templates');
        Schema::dropIfExists('notif_logs');
    }
};
