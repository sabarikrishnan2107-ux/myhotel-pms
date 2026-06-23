<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Floor extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['amenities'=>'array','smokingAllowed'=>'boolean','vipFloor'=>'boolean','hasElevator'=>'boolean','number'=>'integer'];
}
