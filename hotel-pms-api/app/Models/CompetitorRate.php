<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class CompetitorRate extends Model {
    use BelongsToCompany;
    protected $table = 'competitor_rates';
    protected $guarded = ['id'];
    protected $casts = ['rate' => 'integer'];
}
