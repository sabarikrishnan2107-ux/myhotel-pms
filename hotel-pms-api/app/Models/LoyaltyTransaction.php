<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyTransaction extends Model
{
    protected $table = 'loyalty_transactions';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'integer',
        'balance' => 'integer',
    ];
}
