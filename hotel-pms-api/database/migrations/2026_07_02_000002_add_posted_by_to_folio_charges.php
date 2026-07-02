<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('folio_charges', function (Blueprint $t) {
            $t->string('postedBy')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('folio_charges', function (Blueprint $t) {
            $t->dropColumn('postedBy');
        });
    }
};
