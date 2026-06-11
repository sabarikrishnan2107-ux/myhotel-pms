<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class InventoryWastage extends Model {
    protected $table = 'inventory_wastage';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer','cost'=>'integer'];
}
