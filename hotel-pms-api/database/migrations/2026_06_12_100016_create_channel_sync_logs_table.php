<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('channel_sync_logs', function (Blueprint $t) {
            $t->id();
            $t->string('time')->default('');
            $t->string('channel')->default('');
            $t->string('action')->default('');
            $t->string('detail')->nullable();
            $t->string('status')->default('success');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_sync_logs');
    }
};
