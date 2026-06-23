<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class BarPurchaseOrder extends Model {
    use BelongsToCompany;
    protected $table = 'bar_purchase_orders';
    protected $guarded = ['id'];
    protected $casts = ['itemCount'=>'integer','value'=>'integer'];
}
