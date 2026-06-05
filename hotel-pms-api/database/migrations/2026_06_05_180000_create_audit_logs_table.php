<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->string('user')->default('System');
            $t->string('module')->default('');
            $t->string('action')->default('');
            $t->string('entity')->nullable();
            $t->string('before')->nullable();
            $t->string('after')->nullable();
            $t->string('ip')->nullable();
            $t->string('device')->nullable();
            $t->string('severity')->default('info');   // info | warning | critical
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
