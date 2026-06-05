<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Channel extends Model {
    protected $guarded = ['id'];
    protected $casts = ['bookings'=>'integer','commission'=>'integer','rev'=>'integer'];
}
