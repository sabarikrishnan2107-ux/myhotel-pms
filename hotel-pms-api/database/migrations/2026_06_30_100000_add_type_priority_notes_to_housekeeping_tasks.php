<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            $t->string('type')->default('Full clean')->after('room');
            $t->string('priority')->default('normal')->after('status');
            $t->text('notes')->nullable()->after('priority');
        });
    }

    public function down(): void
    {
        Schema::table('housekeeping_tasks', function (Blueprint $t) {
            $t->dropColumn(['type', 'priority', 'notes']);
        });
    }
};
