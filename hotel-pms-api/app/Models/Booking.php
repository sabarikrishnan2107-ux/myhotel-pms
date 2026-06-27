<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Booking extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['vip'=>'boolean','nights'=>'integer','adults'=>'integer','children'=>'integer','total'=>'integer','advance'=>'integer','balance'=>'integer','draftData'=>'array'];
}
