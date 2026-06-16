<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('channel_rate_maps', function (Blueprint $t) {
            $t->id();
            $t->string('type')->default('');
            $t->integer('pms')->default(0);
            $t->integer('bdc')->default(0);
            $t->integer('agoda')->default(0);
            $t->integer('expedia')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_rate_maps');
    }
};
