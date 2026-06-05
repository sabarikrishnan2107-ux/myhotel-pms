<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class FbOrder extends Model {
    protected $table = 'fb_orders';
    protected $guarded = ['id'];
    protected $casts = ['items'=>'array','total'=>'integer'];
}
