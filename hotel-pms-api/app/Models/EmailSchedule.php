<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class EmailSchedule extends Model {
    protected $guarded = ['id'];
    protected $casts = ['recipients'=>'array','sections'=>'array','enabled'=>'boolean'];
}
