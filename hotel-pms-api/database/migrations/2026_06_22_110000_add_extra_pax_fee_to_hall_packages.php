<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hall_packages', function (Blueprint $t) {
            $t->integer('extraPaxFee')->default(0)->after('gst');
        });
    }

    public function down(): void
    {
        Schema::table('hall_packages', function (Blueprint $t) {
            $t->dropColumn('extraPaxFee');
        });
    }
};
