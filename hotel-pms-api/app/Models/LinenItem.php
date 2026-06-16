<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class LinenItem extends Model {
    protected $guarded = ['id'];
    protected $casts = ['issued'=>'integer','returned'=>'integer','wastage'=>'integer','inUse'=>'integer'];
}
