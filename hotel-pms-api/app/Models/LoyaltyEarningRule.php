<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LoyaltyEarningRule extends Model {
    use BelongsToCompany;
    protected $table = 'loyalty_earning_rules';
    protected $guarded = ['id'];
    protected $casts = ['multiplier'=>'float','enabled'=>'boolean'];
}
