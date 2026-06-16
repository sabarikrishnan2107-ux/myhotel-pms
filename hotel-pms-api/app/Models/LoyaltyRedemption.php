<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyRedemption extends Model {
    protected $table = 'loyalty_redemptions';
    protected $guarded = ['id'];
    protected $casts = ['pointsUsed'=>'integer'];
}
