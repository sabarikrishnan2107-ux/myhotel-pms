<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_bookings', function (Blueprint $t) {
            if (!Schema::hasColumn('group_bookings', 'billingMode')) {
                $t->string('billingMode')->default('master');
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_bookings', function (Blueprint $t) {
            if (Schema::hasColumn('group_bookings', 'billingMode')) {
                $t->dropColumn('billingMode');
            }
        });
    }
};
