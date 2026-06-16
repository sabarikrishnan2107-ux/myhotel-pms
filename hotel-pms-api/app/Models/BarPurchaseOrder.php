<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BarPurchaseOrder extends Model {
    protected $table = 'bar_purchase_orders';
    protected $guarded = ['id'];
    protected $casts = ['itemCount'=>'integer','value'=>'integer'];
}
