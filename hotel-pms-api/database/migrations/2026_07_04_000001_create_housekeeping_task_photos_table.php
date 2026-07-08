<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Before/after room photos captured by the housekeeping employee. One row per
 * uploaded image, linked to a housekeeping_tasks row.
 * photoType: before | after
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('housekeeping_task_photos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('taskId')->index();
            $t->unsignedBigInteger('uploadedByUserId')->nullable();
            $t->string('photoType')->default('before'); // before | after
            $t->string('photoUrl');
            $t->unsignedBigInteger('company_id')->nullable()->index();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('housekeeping_task_photos');
    }
};
