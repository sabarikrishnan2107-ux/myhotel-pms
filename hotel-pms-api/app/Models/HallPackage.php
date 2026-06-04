<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class HallPackage extends Model {
    protected $table = 'hall_packages';
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean','capacity'=>'integer','hourly'=>'integer','halfDay'=>'integer','fullDay'=>'integer','setupFee'=>'integer','gst'=>'integer'];
}
