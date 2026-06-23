<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class BarItem extends Model {
    use BelongsToCompany;
    protected $table = 'bar_items';
    protected $guarded = ['id'];
    protected $casts = [
        'opened' => 'float',
        'sealed' => 'integer',
        'par' => 'integer',
        'reorderQty' => 'integer',
        'unitCost' => 'integer',
    ];
}
