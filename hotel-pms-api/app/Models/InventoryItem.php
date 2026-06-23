<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class InventoryItem extends Model {
    use BelongsToCompany;
    protected $table = 'inventory_items';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer','min'=>'integer','price'=>'float'];
}
