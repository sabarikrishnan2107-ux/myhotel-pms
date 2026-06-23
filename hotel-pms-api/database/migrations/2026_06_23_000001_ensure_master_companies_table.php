<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable('master_companies')) return;
        Schema::create('master_companies', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('code')->unique();
            $t->string('admin_email')->nullable();
            $t->string('admin_password')->nullable();
            $t->date('valid_from')->nullable();
            $t->date('valid_to')->nullable();
            $t->string('plan')->default('starter');
            $t->integer('max_branches')->default(1);
            $t->integer('max_rooms')->default(20);
            $t->integer('max_employees')->default(20);
            $t->json('modules')->nullable();
            $t->string('status')->default('active');
            $t->timestamps();
        });
    }
    public function down(): void { /* leave shared table alone */ }
};
