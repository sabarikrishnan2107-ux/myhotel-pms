<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GroupBooking extends Model {
    protected $guarded = ['id'];
    protected $casts = ['block'=>'array','services'=>'array','nights'=>'integer','totalRooms'=>'integer','totalPax'=>'integer','total'=>'integer','advance'=>'integer','balance'=>'integer'];
}
