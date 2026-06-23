<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class InventoryWastage extends Model {
    use BelongsToCompany;
    protected $table = 'inventory_wastage';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer','cost'=>'integer'];
}
