<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GroupService extends Model {
    protected $table = 'group_services';
    protected $guarded = ['id'];
    protected $casts = ['perPax' => 'boolean', 'active' => 'boolean', 'price' => 'integer', 'gst' => 'integer'];
}
