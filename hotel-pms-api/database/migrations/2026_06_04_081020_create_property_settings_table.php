<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('property_settings', function (Blueprint $table) {
            $table->id();
            $table->string('property_name')->default('');
            $table->string('owner_email')->default('');
            $table->string('overbooking')->default('Blocked (manager override)');
            $table->string('branch')->default('');
            $table->string('currency')->default('INR — Indian Rupee (₹)');
            $table->string('country')->default('India');
            $table->string('gst_state')->default('');
            $table->string('city')->default('');
            $table->string('pin_code')->default('');
            $table->string('checkin_time')->default('12:00 PM');
            $table->string('checkout_time')->default('11:00 AM');
            $table->integer('default_advance')->default(30);
            $table->string('gstin')->default('');
            $table->string('pan')->default('');
            $table->string('fssai_license')->default('');
            $table->string('sac_code')->default('');
            $table->string('cin')->default('');
            $table->string('logo')->default('');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('property_settings');
    }
};
