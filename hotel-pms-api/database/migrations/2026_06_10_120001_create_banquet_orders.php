<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('banquet_orders', function (Blueprint $t) {
            $t->id();
            $t->string('beoNo')->default('');
            $t->string('eventName')->default('');
            $t->string('type')->default('');
            $t->string('date')->default('');
            $t->string('venue')->default('');
            $t->string('host')->default('');
            $t->integer('pax')->default(0);
            $t->string('pkg')->default('');
            $t->integer('revenue')->default(0);
            $t->decimal('margin', 4, 2)->default(0);
            $t->integer('advance')->default(0);
            $t->string('status')->default('');
            $t->string('startTime')->nullable();
            $t->string('endTime')->nullable();
            $t->integer('vegPax')->default(0);
            $t->integer('nonVegPax')->default(0);
            $t->text('dietary')->nullable();
            $t->string('barPackage')->nullable();
            $t->text('cocktails')->nullable();
            $t->text('avNotes')->nullable();
            $t->string('decorTheme')->nullable();
            $t->string('decorColor')->nullable();
            $t->integer('staffService')->default(0);
            $t->integer('staffKitchen')->default(0);
            $t->integer('staffCaptains')->default(0);
            $t->integer('parking')->default(0);
            $t->integer('security')->default(0);
            $t->string('florist')->nullable();
            $t->string('photographer')->nullable();
            $t->integer('ancillary')->default(0);
            $t->json('timeline')->nullable();
            $t->json('courses')->nullable();
            $t->json('bars')->nullable();
            $t->json('avEquipment')->nullable();
            $t->json('decorVendors')->nullable();
            $t->json('staffing')->nullable();
            $t->json('vendors')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banquet_orders');
    }
};
