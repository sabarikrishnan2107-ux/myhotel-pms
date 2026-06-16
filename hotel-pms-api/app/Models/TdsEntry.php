<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TdsEntry extends Model {
    protected $table = 'tds_entries';
    protected $guarded = ['id'];
    protected $casts = [
        'amount' => 'integer',
        'rate'   => 'float',
        'tds'    => 'integer',
    ];
}
