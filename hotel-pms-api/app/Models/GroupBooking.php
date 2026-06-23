<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class GroupBooking extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['block'=>'array','services'=>'array','nights'=>'integer','totalRooms'=>'integer','totalPax'=>'integer','total'=>'integer','advance'=>'integer','balance'=>'integer'];
}
