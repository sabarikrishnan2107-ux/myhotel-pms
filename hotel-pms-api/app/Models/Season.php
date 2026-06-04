<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Season extends Model {
    protected $guarded = ['id'];
    protected $casts = ['multiplier'=>'float','active'=>'boolean'];
}
