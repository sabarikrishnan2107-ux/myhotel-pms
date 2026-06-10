<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenanceSchedule extends Model
{
    protected $table = 'maintenance_schedules';
    protected $guarded = ['id'];
    protected $casts = ['durationMin' => 'integer'];
}
