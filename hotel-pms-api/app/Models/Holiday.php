<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCompany;
class Holiday extends Model {
    use BelongsToCompany;
    protected $guarded = ['id'];
    protected $casts = ['surchargePct'=>'integer'];
}
