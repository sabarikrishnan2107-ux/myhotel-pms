<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class RoomType extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['baseTariff'=>'integer','maxAdults'=>'integer','maxChildren'=>'integer','sizeSqft'=>'integer','amenities'=>'array','active'=>'boolean'];
}
