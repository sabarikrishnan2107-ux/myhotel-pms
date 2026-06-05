<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ComplianceLicense extends Model {
    protected $guarded = ['id'];
    protected $casts = ['documents'=>'array','reminders'=>'array','daysToExpiry'=>'integer','fee'=>'integer'];
}
