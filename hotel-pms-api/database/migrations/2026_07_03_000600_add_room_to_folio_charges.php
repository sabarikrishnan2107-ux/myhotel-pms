<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('folio_charges', function (Blueprint $t) {
            if (!Schema::hasColumn('folio_charges', 'room')) {
                // Physical room the charge originated from — lets a group guest's
                // extras be re-attributed (moved between the group master folio and
                // the guest's own folio) when their billTo is toggled.
                $t->string('room')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('folio_charges', function (Blueprint $t) {
            if (Schema::hasColumn('folio_charges', 'room')) {
                $t->dropColumn('room');
            }
        });
    }
};
