<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rate_plans', function (Blueprint $t) {
            $t->integer('breakfastPrice')->default(0)->after('inclDinner');
            $t->integer('lunchPrice')->default(0)->after('breakfastPrice');
            $t->integer('dinnerPrice')->default(0)->after('lunchPrice');
        });
    }

    public function down(): void
    {
        Schema::table('rate_plans', function (Blueprint $t) {
            $t->dropColumn(['breakfastPrice', 'lunchPrice', 'dinnerPrice']);
        });
    }
};
