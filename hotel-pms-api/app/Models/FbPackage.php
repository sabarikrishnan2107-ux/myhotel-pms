<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class FbPackage extends Model {
    use BelongsToCompany;
    protected $table = 'fb_packages';
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean','pax'=>'integer','price'=>'integer','gst'=>'integer'];
}
