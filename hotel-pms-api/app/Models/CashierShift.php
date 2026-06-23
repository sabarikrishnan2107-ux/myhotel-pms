<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class CashierShift extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['number'=>'integer','opening'=>'integer','refunds'=>'integer','expenses'=>'integer','physicalCount'=>'integer','variance'=>'integer'];
}
