<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyEarningRule extends Model {
    protected $table = 'loyalty_earning_rules';
    protected $guarded = ['id'];
    protected $casts = ['multiplier'=>'float','enabled'=>'boolean'];
}
