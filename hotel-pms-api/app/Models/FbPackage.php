<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FbPackage extends Model {
    protected $table = 'fb_packages';
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean','pax'=>'integer','price'=>'integer','gst'=>'integer'];
}
