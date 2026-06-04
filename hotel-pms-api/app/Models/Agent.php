<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Agent extends Model {
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean','creditLimit'=>'integer','commissionPct'=>'integer'];
}
