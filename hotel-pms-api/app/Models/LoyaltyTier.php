<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LoyaltyTier extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['minSpend'=>'integer','minNights'=>'integer','pointsRate'=>'float','discountPct'=>'integer','freeBreakfast'=>'boolean','welcomeDrink'=>'boolean','priorityBooking'=>'boolean','vipTag'=>'boolean','perks'=>'array'];
}
