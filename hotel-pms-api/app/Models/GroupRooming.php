<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GroupRooming extends Model {
    protected $table = 'group_rooming';
    protected $guarded = ['id'];
    protected $casts = ['pax'=>'integer'];
}
