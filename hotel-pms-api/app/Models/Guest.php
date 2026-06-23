<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Guest extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['vip'=>'boolean','blacklist'=>'boolean','preferences'=>'array','lifetimeNights'=>'integer','lifetimeSpend'=>'integer','loyaltyPoints'=>'integer','kycVerified'=>'boolean'];
}
