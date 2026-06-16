<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AmcContract extends Model
{
    protected $table = 'amc_contracts';
    protected $guarded = ['id'];
    protected $casts = ['annualFee' => 'integer', 'slaResponseHours' => 'integer'];
}
