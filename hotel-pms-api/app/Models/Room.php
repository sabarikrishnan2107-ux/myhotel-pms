<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Room extends Model {
    protected $guarded = ['id'];
    protected $casts = ['amenities'=>'array','extraBedAllowed'=>'boolean','smoking'=>'boolean','accessible'=>'boolean','floor'=>'integer','maxAdults'=>'integer','maxChildren'=>'integer','sizeSqft'=>'integer','baseTariff'=>'integer','extraBedRate'=>'integer'];
}
