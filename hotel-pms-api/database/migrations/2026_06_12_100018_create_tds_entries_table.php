<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tds_entries', function (Blueprint $t) {
            $t->id();
            $t->string('section');
            $t->string('description');
            $t->string('partyType')->nullable();
            $t->bigInteger('amount')->default(0);
            $t->decimal('rate', 6, 2)->default(0);
            $t->bigInteger('tds')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tds_entries');
    }
};
