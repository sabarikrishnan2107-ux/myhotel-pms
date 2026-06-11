<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $t) {
            $t->id();
            $t->string('name')->default('');
            $t->string('status')->default('');
            $t->string('category')->default('');
            $t->string('language')->default('');
            $t->text('header')->nullable();
            $t->text('body');
            $t->text('footer')->nullable();
            $t->json('buttons')->nullable();
            $t->text('rejectionReason')->nullable();
            $t->string('lastEdited')->default('');
            $t->string('editedBy')->default('');
            $t->integer('usage30d')->default(0);
            $t->string('submittedOn')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');
    }
};
