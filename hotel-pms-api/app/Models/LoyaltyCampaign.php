<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LoyaltyCampaign extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['applicableTiers'=>'array','applicableRoomTypes'=>'array','minBookingAmount'=>'integer','active'=>'boolean','redemptions'=>'integer'];
}
