<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class RatePlan extends Model {
    use BelongsToCompany;
    protected $table = 'rate_plans';
    protected $guarded = ['id'];
    protected $casts = ['inclBreakfast'=>'boolean','inclLunch'=>'boolean','inclDinner'=>'boolean','refundable'=>'boolean','active'=>'boolean','discountPct'=>'integer'];
}
