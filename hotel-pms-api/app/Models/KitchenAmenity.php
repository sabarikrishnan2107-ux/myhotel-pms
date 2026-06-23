<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class KitchenAmenity extends Model {
    use BelongsToCompany;
    protected $table = 'kitchen_amenities';
    protected $guarded = ['id'];
}
