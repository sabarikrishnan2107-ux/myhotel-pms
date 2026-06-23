<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class BanquetOrder extends Model
{
    use BelongsToCompany;
    protected $table = 'banquet_orders';
    protected $guarded = ['id'];
    protected $casts = ['pax' => 'integer', 'revenue' => 'integer', 'margin' => 'float', 'advance' => 'integer', 'vegPax' => 'integer', 'nonVegPax' => 'integer', 'staffService' => 'integer', 'staffKitchen' => 'integer', 'staffCaptains' => 'integer', 'parking' => 'integer', 'security' => 'integer', 'ancillary' => 'integer', 'timeline' => 'array', 'courses' => 'array', 'bars' => 'array', 'avEquipment' => 'array', 'decorVendors' => 'array', 'staffing' => 'array', 'vendors' => 'array'];
}
