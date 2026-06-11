<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OtaBooking extends Model {
    protected $table = 'ota_bookings';
    protected $guarded = ['id'];
    protected $casts = [
        'nights' => 'integer',
        'total'  => 'integer',
    ];
}
