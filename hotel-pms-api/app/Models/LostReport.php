<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LostReport extends Model {
    protected $table = 'lost_reports';
    protected $guarded = ['id'];
    protected $casts = [
        'timeline' => 'array', 'matches' => 'array',
        'isWalkIn' => 'boolean', 'hasPhoto' => 'boolean', 'hvi' => 'boolean',
        'estValue' => 'integer',
    ];
}
