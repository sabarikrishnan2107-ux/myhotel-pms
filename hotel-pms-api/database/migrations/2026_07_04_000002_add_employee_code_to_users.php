<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unique employee code for staff logins. Housekeeping employees are auto-assigned
 * a 2000-series code (2001, 2002, …) by StaffController; the housekeeping mobile
 * app lets them log in with this code.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (! Schema::hasColumn('users', 'employee_code')) {
                $t->string('employee_code')->nullable()->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropColumn('employee_code');
        });
    }
};
