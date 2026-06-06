<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_rooming', function (Blueprint $t) {
            $t->id();
            $t->string('groupCode')->default('');
            $t->string('roomNo')->nullable();
            $t->string('roomType')->default('');
            $t->string('lead')->default('');
            $t->integer('pax')->default(1);
            $t->string('phone')->nullable();
            $t->string('remarks')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_rooming');
    }
};
