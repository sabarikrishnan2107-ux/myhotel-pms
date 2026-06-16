<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('agent_ledgers', function (Blueprint $t) {
            $t->id();
            $t->string('agentName');
            $t->string('date');
            $t->string('type'); // Invoice | Payment | Credit Note | Adjustment
            $t->string('bookingNo')->nullable();
            $t->string('description');
            $t->integer('debit')->default(0);
            $t->integer('credit')->default(0);
            $t->integer('balance')->default(0);
            $t->string('mode')->nullable();
            $t->string('reference')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_ledgers');
    }
};
