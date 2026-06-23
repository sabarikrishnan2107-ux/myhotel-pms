<?php
namespace App\Models;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
class Role extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['permissions'=>'array','active'=>'boolean','users'=>'integer'];
}
