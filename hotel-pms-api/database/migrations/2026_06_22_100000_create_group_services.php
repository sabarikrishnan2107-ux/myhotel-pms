<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_services', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('category')->default('Other');
            $t->integer('price')->default(0);
            $t->boolean('perPax')->default(false);
            $t->integer('gst')->default(0);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_services');
    }
};
