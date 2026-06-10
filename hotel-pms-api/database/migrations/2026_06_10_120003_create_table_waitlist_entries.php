<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('table_waitlist_entries', function (Blueprint $t) {
            $t->id();
            $t->string('guest')->default('');
            $t->integer('party')->default(0);
            $t->string('phone')->default('');
            $t->integer('waitMin')->default(0);
            $t->string('arrivedAt')->default('');
            $t->boolean('notified')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_waitlist_entries');
    }
};
