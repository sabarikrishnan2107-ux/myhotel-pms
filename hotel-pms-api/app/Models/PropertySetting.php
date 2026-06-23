<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class PropertySetting extends Model
{
    use BelongsToCompany;

    /**
     * Property & Branch configuration — per-company settings row.
     */
    protected $guarded = ['id'];

    protected $casts = [
        'default_advance' => 'integer',
    ];
}
