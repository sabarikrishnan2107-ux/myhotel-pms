<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('gst_returns', function (Blueprint $t) {
            $t->id();
            $t->string('label');
            $t->bigInteger('taxable')->default(0);
            $t->bigInteger('igst')->default(0);
            $t->bigInteger('cgst')->default(0);
            $t->bigInteger('sgst')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gst_returns');
    }
};
