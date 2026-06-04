<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Floor extends Model {
    protected $guarded = ['id'];
    protected $casts = ['amenities'=>'array','smokingAllowed'=>'boolean','vipFloor'=>'boolean','hasElevator'=>'boolean','number'=>'integer'];
}
