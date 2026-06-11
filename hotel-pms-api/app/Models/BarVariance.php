<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BarVariance extends Model {
    protected $table = 'bar_variances';
    protected $guarded = ['id'];
    protected $casts = [
        'theoreticalMl' => 'integer',
        'actualMl' => 'integer',
        'unitCost' => 'integer',
    ];
}
