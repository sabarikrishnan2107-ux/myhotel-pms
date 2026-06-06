<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyTier extends Model {
    protected $guarded = ['id'];
    protected $casts = ['minSpend'=>'integer','minNights'=>'integer','pointsRate'=>'float','discountPct'=>'integer','freeBreakfast'=>'boolean','welcomeDrink'=>'boolean','priorityBooking'=>'boolean','vipTag'=>'boolean','perks'=>'array'];
}
