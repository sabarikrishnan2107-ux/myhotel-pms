<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Booking extends Model {
    protected $guarded = ['id'];
    protected $casts = ['vip'=>'boolean','nights'=>'integer','adults'=>'integer','children'=>'integer','total'=>'integer','advance'=>'integer','balance'=>'integer','draftData'=>'array'];
}
