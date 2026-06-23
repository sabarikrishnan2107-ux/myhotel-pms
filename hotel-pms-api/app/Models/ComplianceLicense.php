<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class ComplianceLicense extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['documents'=>'array','reminders'=>'array','daysToExpiry'=>'integer','fee'=>'integer'];
}
