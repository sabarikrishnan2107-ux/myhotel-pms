<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class TdsEntry extends Model {
    use BelongsToCompany;
    protected $table = 'tds_entries';
    protected $guarded = ['id'];
    protected $casts = [
        'amount' => 'integer',
        'rate'   => 'float',
        'tds'    => 'integer',
    ];
}
