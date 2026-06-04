<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RatePlan extends Model {
    protected $table = 'rate_plans';
    protected $guarded = ['id'];
    protected $casts = ['inclBreakfast'=>'boolean','inclLunch'=>'boolean','inclDinner'=>'boolean','refundable'=>'boolean','active'=>'boolean','discountPct'=>'integer'];
}
