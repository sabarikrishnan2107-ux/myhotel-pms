<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guests', function (Blueprint $t) {
            $t->boolean('kycVerified')->default(false);
            $t->string('kycVerifiedAt')->nullable();
            $t->string('kycVerifiedBy')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('guests', function (Blueprint $t) {
            $t->dropColumn(['kycVerified', 'kycVerifiedAt', 'kycVerifiedBy']);
        });
    }
};
