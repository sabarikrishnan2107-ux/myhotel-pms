<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class OtaBooking extends Model {
    use BelongsToCompany;
    protected $table = 'ota_bookings';
    protected $guarded = ['id'];
    protected $casts = [
        'nights' => 'integer',
        'total'  => 'integer',
    ];
}
