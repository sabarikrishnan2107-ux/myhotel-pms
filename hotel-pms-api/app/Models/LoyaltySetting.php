<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltySetting extends Model
{
    protected $table = 'loyalty_settings';
    protected $guarded = ['id'];
    protected $casts = ['pointsValueRupees' => 'float', 'pointsExpiryMonths' => 'integer', 'taxBeforeDiscount' => 'boolean', 'approvalRequiredAbove' => 'integer', 'manualAdjustNeedsApproval' => 'boolean', 'redemptionOtp' => 'boolean'];
}
