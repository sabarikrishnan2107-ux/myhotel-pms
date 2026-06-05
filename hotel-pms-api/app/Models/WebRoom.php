<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class WebRoom extends Model {
    protected $guarded = ['id'];
    protected $casts = ['price'=>'integer','published'=>'boolean'];
}
