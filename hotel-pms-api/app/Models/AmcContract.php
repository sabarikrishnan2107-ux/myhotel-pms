<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class AmcContract extends Model
{
    use BelongsToCompany;
    protected $table = 'amc_contracts';
    protected $guarded = ['id'];
    protected $casts = ['annualFee' => 'integer', 'slaResponseHours' => 'integer'];
}
