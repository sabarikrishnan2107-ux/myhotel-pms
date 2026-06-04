<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InventoryItem extends Model {
    protected $table = 'inventory_items';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer','min'=>'integer','price'=>'float'];
}
