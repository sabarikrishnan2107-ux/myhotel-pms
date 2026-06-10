<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TableReservation extends Model
{
    protected $table = 'table_reservations';
    protected $guarded = ['id'];
    protected $casts = ['party' => 'integer', 'startHr' => 'float', 'durHr' => 'float'];
}
