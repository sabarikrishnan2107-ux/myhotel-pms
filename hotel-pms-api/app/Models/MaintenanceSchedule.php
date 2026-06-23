<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class MaintenanceSchedule extends Model
{
    use BelongsToCompany;
    protected $table = 'maintenance_schedules';
    protected $guarded = ['id'];
    protected $casts = ['durationMin' => 'integer'];
}
