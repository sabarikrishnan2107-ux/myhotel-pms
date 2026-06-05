<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class HallBooking extends Model {
    protected $guarded = ['id'];
    protected $casts = ['guests'=>'integer','advance'=>'integer','total'=>'integer'];
}
