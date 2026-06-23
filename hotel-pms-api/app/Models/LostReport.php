<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class LostReport extends Model {
    use BelongsToCompany;
    protected $table = 'lost_reports';
    protected $guarded = ['id'];
    protected $casts = [
        'timeline' => 'array', 'matches' => 'array',
        'isWalkIn' => 'boolean', 'hasPhoto' => 'boolean', 'hvi' => 'boolean',
        'estValue' => 'integer',
    ];
}
