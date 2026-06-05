<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channels', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('status')->default('disconnected');   // connected | syncing | disconnected
            $t->string('lastSync')->nullable();
            $t->integer('bookings')->default(0);
            $t->integer('commission')->default(0);
            $t->integer('rev')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channels');
    }
};
