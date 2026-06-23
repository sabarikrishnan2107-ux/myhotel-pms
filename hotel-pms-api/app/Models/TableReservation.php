<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class TableReservation extends Model
{
    use BelongsToCompany;
    protected $table = 'table_reservations';
    protected $guarded = ['id'];
    protected $casts = ['party' => 'integer', 'startHr' => 'float', 'durHr' => 'float'];
}
