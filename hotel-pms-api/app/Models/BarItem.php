<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BarItem extends Model {
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
