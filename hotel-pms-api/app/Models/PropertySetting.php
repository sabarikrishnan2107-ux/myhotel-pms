<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PropertySetting extends Model
{
    /**
     * Property & Branch configuration — a single-row settings table (id = 1).
     */
    protected $guarded = ['id'];

    protected $casts = [
        'default_advance' => 'integer',
    ];
}
