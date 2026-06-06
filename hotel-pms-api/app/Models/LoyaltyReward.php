<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyReward extends Model {
    protected $guarded = ['id'];
    protected $casts = ['pointsCost'=>'integer','cashValue'=>'integer','active'=>'boolean'];
}
