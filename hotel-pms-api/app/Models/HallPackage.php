<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class HallPackage extends Model {
    use BelongsToCompany;
    protected $table = 'hall_packages';
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean','capacity'=>'integer','hourly'=>'integer','halfDay'=>'integer','fullDay'=>'integer','setupFee'=>'integer','gst'=>'integer'];
}
