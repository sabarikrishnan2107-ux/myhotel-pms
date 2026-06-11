<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('loyalty_transactions', function (Blueprint $t) {
            $t->id();
            $t->string('memberId')->default('');
            $t->string('date')->default('');
            $t->string('kind')->default('Earn');
            $t->string('source')->default('');
            $t->string('bookingNo')->nullable();
            $t->integer('amount')->default(0);
            $t->integer('balance')->default(0);
            $t->string('staff')->nullable();
            $t->string('notes')->nullable();
            $t->string('expiresOn')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');
    }
};
