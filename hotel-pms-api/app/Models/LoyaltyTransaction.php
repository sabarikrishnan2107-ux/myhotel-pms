<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class LoyaltyTransaction extends Model
{
    use BelongsToCompany;
    protected $table = 'loyalty_transactions';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'integer',
        'balance' => 'integer',
    ];
}
