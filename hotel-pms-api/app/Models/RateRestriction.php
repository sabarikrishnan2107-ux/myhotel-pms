<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class RateRestriction extends Model {
    protected $guarded = ['id'];
    protected $casts = ['channels' => 'array'];
}
