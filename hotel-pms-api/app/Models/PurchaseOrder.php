<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class PurchaseOrder extends Model {
    use BelongsToCompany;
    protected $table = 'purchase_orders';
    protected $guarded = ['id'];
    protected $casts = ['items'=>'integer','amount'=>'integer'];
}
