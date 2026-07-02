<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_items', function (Blueprint $t) {
            $t->id();
            $t->string('kind')->default('');
            $t->string('name')->default('');
            $t->integer('price')->default(0);
            $t->string('hint')->nullable();
            $t->boolean('active')->default(true);
            $t->unsignedBigInteger('company_id')->nullable()->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_items');
    }
};
