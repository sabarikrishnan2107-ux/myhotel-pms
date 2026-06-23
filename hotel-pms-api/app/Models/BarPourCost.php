<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class BarPourCost extends Model {
    use BelongsToCompany;
    protected $table = 'bar_pour_costs';
    protected $guarded = ['id'];
    protected $casts = ['soldValue'=>'integer','theoreticalCost'=>'integer','actualCost'=>'integer'];
}
