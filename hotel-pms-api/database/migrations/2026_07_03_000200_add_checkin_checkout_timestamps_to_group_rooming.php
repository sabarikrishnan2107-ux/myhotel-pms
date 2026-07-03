<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (!Schema::hasColumn('group_rooming', 'checkedInAt')) {
                $t->string('checkedInAt')->nullable();
            }
            if (!Schema::hasColumn('group_rooming', 'checkedOutAt')) {
                $t->string('checkedOutAt')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('group_rooming', function (Blueprint $t) {
            if (Schema::hasColumn('group_rooming', 'checkedInAt')) {
                $t->dropColumn('checkedInAt');
            }
            if (Schema::hasColumn('group_rooming', 'checkedOutAt')) {
                $t->dropColumn('checkedOutAt');
            }
        });
    }
};
