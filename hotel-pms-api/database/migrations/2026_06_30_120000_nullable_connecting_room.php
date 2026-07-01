<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $t) {
            $t->string('connectingRoom', 50)->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $t) {
            $t->string('connectingRoom', 50)->nullable(false)->default('')->change();
        });
    }
};
