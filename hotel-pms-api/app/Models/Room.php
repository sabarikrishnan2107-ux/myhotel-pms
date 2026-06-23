<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Room extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['amenities'=>'array','extraBedAllowed'=>'boolean','smoking'=>'boolean','accessible'=>'boolean','floor'=>'integer','maxAdults'=>'integer','maxChildren'=>'integer','sizeSqft'=>'integer','baseTariff'=>'integer','extraBedRate'=>'integer'];
}
