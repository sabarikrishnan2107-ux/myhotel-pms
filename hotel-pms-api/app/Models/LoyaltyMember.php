<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LoyaltyMember extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['upcomingBooking'=>'array','preferences'=>'array','consentMarketing'=>'boolean','blocked'=>'boolean','pointsBalance'=>'integer','lifetimePoints'=>'integer','lifetimeStays'=>'integer','lifetimeNights'=>'integer','lifetimeSpend'=>'integer'];
}
