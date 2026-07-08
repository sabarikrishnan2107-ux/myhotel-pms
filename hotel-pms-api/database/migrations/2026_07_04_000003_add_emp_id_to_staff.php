<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Employee code on the HR roster (staff table). For housekeeping staff this is
 * the 2000-series id; creating such a staff row also provisions a matching
 * users login (see ResourceController::provisionHousekeepingLogin).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $t) {
            if (! Schema::hasColumn('staff', 'empId')) {
                $t->string('empId')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $t) {
            $t->dropColumn('empId');
        });
    }
};
