<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;

class PosTable extends Model
{
    use BelongsToCompany;
    protected $table = 'pos_tables';
    protected $guarded = ['id'];
    protected $casts = ['seats' => 'integer', 'covers' => 'integer'];
}
