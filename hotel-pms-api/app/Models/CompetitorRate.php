<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class CompetitorRate extends Model {
    protected $table = 'competitor_rates';
    protected $guarded = ['id'];
    protected $casts = ['rate' => 'integer'];
}
