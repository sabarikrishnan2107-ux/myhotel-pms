<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InventoryPurchase extends Model {
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
