<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('table_reservations', function (Blueprint $t) {
            $t->id();
            $t->string('table')->default('');
            $t->string('startHr')->default('');
            $t->string('durHr')->default('');
            $t->string('guest')->default('');
            $t->integer('party')->default(0);
            $t->string('phone')->default('');
            $t->text('notes')->nullable();
            $t->string('occasion')->default('');
            $t->string('status')->default('');
            $t->string('source')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_reservations');
    }
};
