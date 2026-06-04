<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Role extends Model {
    protected $guarded = ['id'];
    protected $casts = ['permissions'=>'array','active'=>'boolean','users'=>'integer'];
}
