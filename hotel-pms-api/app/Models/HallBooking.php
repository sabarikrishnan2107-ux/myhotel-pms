<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class HallBooking extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['guests'=>'integer','advance'=>'integer','total'=>'integer'];
}
