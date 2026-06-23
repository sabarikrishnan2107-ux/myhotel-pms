<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LoyaltyRedemption extends Model {
    use BelongsToCompany;
    protected $table = 'loyalty_redemptions';
    protected $guarded = ['id'];
    protected $casts = ['pointsUsed'=>'integer'];
}
