<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyMember extends Model {
    protected $guarded = ['id'];
    protected $casts = ['upcomingBooking'=>'array','preferences'=>'array','consentMarketing'=>'boolean','blocked'=>'boolean','pointsBalance'=>'integer','lifetimePoints'=>'integer','lifetimeStays'=>'integer','lifetimeNights'=>'integer','lifetimeSpend'=>'integer'];
}
