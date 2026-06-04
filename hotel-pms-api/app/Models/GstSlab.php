<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GstSlab extends Model {
    protected $table = 'gst_slabs';
    protected $guarded = ['id'];
    protected $casts = ['from'=>'integer','to'=>'integer','rate'=>'integer'];
}
