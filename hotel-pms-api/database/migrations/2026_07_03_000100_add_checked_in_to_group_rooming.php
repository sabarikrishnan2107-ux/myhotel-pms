<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (!Schema::hasColumn('group_rooming', 'checkedIn')) {
                $t->boolean('checkedIn')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (Schema::hasColumn('group_rooming', 'checkedIn')) {
                $t->dropColumn('checkedIn');
            }
        });
    }
};
