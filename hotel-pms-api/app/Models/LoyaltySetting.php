<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class LoyaltySetting extends Model
{
    use BelongsToCompany;
    protected $table = 'loyalty_settings';
    protected $guarded = ['id'];
    protected $casts = ['pointsValueRupees' => 'float', 'pointsExpiryMonths' => 'integer', 'taxBeforeDiscount' => 'boolean', 'approvalRequiredAbove' => 'integer', 'manualAdjustNeedsApproval' => 'boolean', 'redemptionOtp' => 'boolean'];
}
