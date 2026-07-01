<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cashier_shifts', function (Blueprint $t) {
            if (!Schema::hasColumn('cashier_shifts', 'staffName')) {
                $t->string('staffName')->default('');
            }
            if (!Schema::hasColumn('cashier_shifts', 'openedAt')) {
                $t->string('openedAt')->nullable();
            }
            if (!Schema::hasColumn('cashier_shifts', 'openingBalance')) {
                $t->integer('openingBalance')->default(0);
            }
            if (!Schema::hasColumn('cashier_shifts', 'closingBalance')) {
                $t->integer('closingBalance')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('cashier_shifts', function (Blueprint $t) {
            $t->dropColumnIfExists('staffName');
            $t->dropColumnIfExists('openedAt');
            $t->dropColumnIfExists('openingBalance');
            $t->dropColumnIfExists('closingBalance');
        });
    }
};
