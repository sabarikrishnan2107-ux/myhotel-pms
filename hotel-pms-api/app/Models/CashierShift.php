<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class CashierShift extends Model {
    protected $guarded = ['id'];
    protected $casts = ['number'=>'integer','opening'=>'integer','refunds'=>'integer','expenses'=>'integer','physicalCount'=>'integer','variance'=>'integer'];
}
