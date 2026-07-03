<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class GroupRooming extends Model {
    use BelongsToCompany;
    protected $table = 'group_rooming';
    protected $guarded = ['id'];
    protected $casts = ['pax'=>'integer','checkedIn'=>'boolean','checkedOut'=>'boolean'];
    protected $attributes = ['checkedIn' => false, 'checkedOut' => false];
}
