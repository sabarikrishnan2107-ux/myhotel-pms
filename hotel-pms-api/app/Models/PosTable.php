<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosTable extends Model
{
    protected $table = 'pos_tables';
    protected $guarded = ['id'];
    protected $casts = ['seats' => 'integer', 'covers' => 'integer'];
}
