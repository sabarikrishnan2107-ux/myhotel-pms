<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class StockMovement extends Model {
    use BelongsToCompany;
    protected $table = 'stock_movements';
    protected $guarded = ['id'];
    protected $casts = ['qty'=>'integer'];
}
