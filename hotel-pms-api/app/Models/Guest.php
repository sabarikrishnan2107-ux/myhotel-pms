<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Guest extends Model {
    protected $guarded = ['id'];
    protected $casts = ['vip'=>'boolean','blacklist'=>'boolean','preferences'=>'array','lifetimeNights'=>'integer','lifetimeSpend'=>'integer','loyaltyPoints'=>'integer','kycVerified'=>'boolean'];
}
