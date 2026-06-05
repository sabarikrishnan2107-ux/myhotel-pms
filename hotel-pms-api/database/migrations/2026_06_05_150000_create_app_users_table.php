<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_users', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('email')->default('');
            $t->string('role')->default('Reception');
            $t->string('status')->default('active');   // active | disabled
            $t->string('last')->nullable();
            $t->boolean('twoFA')->default(false);
            $t->string('phone')->nullable();
            $t->string('joinedAt')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_users');
    }
};
