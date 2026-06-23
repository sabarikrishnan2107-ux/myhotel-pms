<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LoyaltyReward extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['pointsCost'=>'integer','cashValue'=>'integer','active'=>'boolean'];
}
