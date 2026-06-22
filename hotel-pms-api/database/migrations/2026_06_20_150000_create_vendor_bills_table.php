<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendor_bills', function (Blueprint $table) {
            $table->id();
            $table->string('billNo');
            $table->string('vendor');
            $table->string('category')->nullable();
            $table->string('billDate');
            $table->string('dueDate');
            $table->integer('taxableValue')->default(0);
            $table->integer('gst')->default(0);
            $table->integer('tdsRate')->default(0);
            $table->integer('tdsAmount')->default(0);
            $table->integer('netPayable')->default(0);
            $table->integer('paid')->default(0);
            $table->string('status')->default('Draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_bills');
    }
};
