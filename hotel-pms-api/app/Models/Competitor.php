<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Competitor extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['km' => 'float', 'stars' => 'integer', 'active' => 'boolean'];
}
