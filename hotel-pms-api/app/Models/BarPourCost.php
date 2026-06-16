<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BarPourCost extends Model {
    protected $table = 'bar_pour_costs';
    protected $guarded = ['id'];
    protected $casts = ['soldValue'=>'integer','theoreticalCost'=>'integer','actualCost'=>'integer'];
}
