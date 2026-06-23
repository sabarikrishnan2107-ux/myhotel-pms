<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class BarVariance extends Model {
    use BelongsToCompany;
    protected $table = 'bar_variances';
    protected $guarded = ['id'];
    protected $casts = [
        'theoreticalMl' => 'integer',
        'actualMl' => 'integer',
        'unitCost' => 'integer',
    ];
}
