<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('room_types', function (Blueprint $t) {
            if (!Schema::hasColumn('room_types', 'extraAdultRate')) $t->integer('extraAdultRate')->default(0);
            if (!Schema::hasColumn('room_types', 'extraChildRate')) $t->integer('extraChildRate')->default(0);
        });
    }
    public function down(): void {
        Schema::table('room_types', function (Blueprint $t) {
            foreach (['extraAdultRate', 'extraChildRate'] as $c) {
                if (Schema::hasColumn('room_types', $c)) $t->dropColumn($c);
            }
        });
    }
};
