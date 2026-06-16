<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pos_tables', function (Blueprint $t) {
            $t->id();
            $t->string('code')->default('');
            $t->integer('seats')->default(0);
            $t->string('status')->default('');
            $t->string('server')->nullable();
            $t->integer('covers')->nullable();
            $t->string('seatedAt')->nullable();
            $t->string('zone')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pos_tables');
    }
};
