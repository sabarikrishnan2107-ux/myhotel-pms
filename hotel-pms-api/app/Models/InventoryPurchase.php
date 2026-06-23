<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class InventoryPurchase extends Model {
    use BelongsToCompany;
    protected $table = 'inventory_purchases';
    protected $guarded = ['id'];
    protected $casts = [
        'lines'       => 'array',
        'goodsPhotos' => 'array',
        'discount'    => 'integer',
        'freight'     => 'integer',
        'roundOff'    => 'integer',
        'paidAmount'  => 'integer',
        'interState'  => 'boolean',
    ];
}
