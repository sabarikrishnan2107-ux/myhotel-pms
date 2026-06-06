<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LoyaltyCampaign extends Model {
    protected $guarded = ['id'];
    protected $casts = ['applicableTiers'=>'array','applicableRoomTypes'=>'array','minBookingAmount'=>'integer','active'=>'boolean','redemptions'=>'integer'];
}
