<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Staff extends Model {
    use BelongsToCompany;
    protected $table = 'staff';
    protected $guarded = ['id'];
    protected $casts = ['active'=>'boolean','salary'=>'integer'];
}
