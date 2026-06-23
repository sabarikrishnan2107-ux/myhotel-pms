<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class RoomAmenity extends Model {
    use BelongsToCompany;
    protected $table = 'room_amenities';
    protected $guarded = ['id'];
}
